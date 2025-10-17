import { useCallback, useEffect, useMemo, useState } from 'react';
import { sepolia } from 'wagmi/chains';
import { useAccount, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';

import {
  CONFIDENTIAL_ZAMA_ABI,
  CONFIDENTIAL_ZAMA_ADDRESS,
  ZAMA_NFT_ABI,
  ZAMA_NFT_ADDRESS,
} from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { TokenCard, type TokenInfo } from './TokenCard';
import '../styles/Dashboard.css';

type BalanceState = {
  encrypted: string;
  decrypted?: number;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
// No event usage per requirements

export function NFTDashboard() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const signer = useEthersSigner();
  const { instance, error: zamaError } = useZamaInstance();

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [minting, setMinting] = useState(false);
  const [balance, setBalance] = useState<BalanceState | null>(null);
  const [isDecryptingBalance, setIsDecryptingBalance] = useState(false);

  const networkMismatch = chain && chain.id !== sepolia.id;
  const nftConfigured = String(ZAMA_NFT_ADDRESS).toLowerCase() !== ZERO_ADDRESS.toLowerCase();
  const czamaConfigured = String(CONFIDENTIAL_ZAMA_ADDRESS).toLowerCase() !== ZERO_ADDRESS.toLowerCase();

  const configurationReady = nftConfigured && czamaConfigured;

  const loadTokens = useCallback(async () => {
    if (!address || !publicClient || !nftConfigured) {
      setTokens([]);
      return;
    }

    setIsLoadingTokens(true);
    try {
      // Enumerate tokens without using events: scan 1..totalMinted and check ownerOf
      const totalMinted = (await publicClient.readContract({
        address: ZAMA_NFT_ADDRESS,
        abi: ZAMA_NFT_ABI,
        functionName: 'totalMinted',
      })) as bigint;

      if (!totalMinted || totalMinted === 0n) {
        setTokens([]);
        return;
      }

      const ownerLower = address.toLowerCase();
      const ids: bigint[] = Array.from({ length: Number(totalMinted) }, (_, i) => BigInt(i + 1));

      // Chunk helper
      const chunk = <T,>(arr: T[], size: number) => arr.reduce<T[][]>((acc, _, i) => (i % size === 0 ? [...acc, arr.slice(i, i + size)] : acc), []);
      const idChunks = chunk(ids, 100);

      const ownedIds: bigint[] = [];
      for (const group of idChunks) {
        // Prefer multicall to minimize RPC roundtrips
        const calls = group.map((tokenId) => ({
          address: ZAMA_NFT_ADDRESS as `0x${string}`,
          abi: ZAMA_NFT_ABI as any,
          functionName: 'ownerOf',
          args: [tokenId],
        }));

        let results: any[] = [];
        try {
          // @ts-ignore viem supports multicall on publicClient
          const res = await (publicClient as any).multicall({ contracts: calls, allowFailure: true });
          results = res as any[];
        } catch {
          // Fallback to sequential calls if multicall is not available
          results = await Promise.all(
            calls.map(async (c) => {
              try {
                const value = (await publicClient.readContract(c)) as string;
                return { status: 'success', result: value };
              } catch (e) {
                return { status: 'failure', error: e };
              }
            })
          );
        }

        results.forEach((r, idx) => {
          if (r && r.status === 'success' && typeof r.result === 'string') {
            if (r.result.toLowerCase() === ownerLower) {
              ownedIds.push(group[idx]);
            }
          }
        });
      }

      if (ownedIds.length === 0) {
        setTokens([]);
        return;
      }

      // Load token details for owned IDs
      const detailChunks = chunk(ownedIds, 100);
      const details: { tokenId: bigint; encryptedAllocation: string; isClaimed: boolean }[] = [];
      for (const group of detailChunks) {
        const allocCalls = group.map((tokenId) => ({
          address: ZAMA_NFT_ADDRESS as `0x${string}`,
          abi: ZAMA_NFT_ABI as any,
          functionName: 'getEncryptedAllocation',
          args: [tokenId],
        }));
        const claimedCalls = group.map((tokenId) => ({
          address: ZAMA_NFT_ADDRESS as `0x${string}`,
          abi: ZAMA_NFT_ABI as any,
          functionName: 'isRewardClaimed',
          args: [tokenId],
        }));

        let allocRes: any[];
        let claimRes: any[];
        try {
          // @ts-ignore
          allocRes = await (publicClient as any).multicall({ contracts: allocCalls, allowFailure: true });
          // @ts-ignore
          claimRes = await (publicClient as any).multicall({ contracts: claimedCalls, allowFailure: true });
        } catch {
          allocRes = await Promise.all(
            allocCalls.map(async (c) => {
              try {
                const v = (await publicClient.readContract(c)) as string;
                return { status: 'success', result: v };
              } catch (e) {
                return { status: 'failure', error: e };
              }
            })
          );
          claimRes = await Promise.all(
            claimedCalls.map(async (c) => {
              try {
                const v = (await publicClient.readContract(c)) as boolean;
                return { status: 'success', result: v };
              } catch (e) {
                return { status: 'failure', error: e };
              }
            })
          );
        }

        group.forEach((tokenId, i) => {
          const enc = allocRes[i]?.status === 'success' ? (allocRes[i].result as string) : '0x0';
          const claimed = claimRes[i]?.status === 'success' ? Boolean(claimRes[i].result) : false;
          details.push({ tokenId, encryptedAllocation: enc, isClaimed: claimed });
        });
      }

      setTokens((previous) =>
        details.map((token) => {
          const existing = previous.find((item) => item.tokenId === token.tokenId);
          return {
            tokenId: token.tokenId,
            encryptedAllocation: token.encryptedAllocation,
            isClaimed: token.isClaimed,
            decryptedAllocation: existing?.decryptedAllocation,
            claiming: false,
            decrypting: false,
          } satisfies TokenInfo;
        })
      );
    } finally {
      setIsLoadingTokens(false);
    }
  }, [address, publicClient, nftConfigured]);

  const loadBalance = useCallback(async () => {
    if (!address || !publicClient || !czamaConfigured) {
      setBalance(null);
      return;
    }

    try {
      const encryptedBalance = (await publicClient.readContract({
        address: CONFIDENTIAL_ZAMA_ADDRESS,
        abi: CONFIDENTIAL_ZAMA_ABI,
        functionName: 'confidentialBalanceOf',
        args: [address],
      })) as string;
      setBalance({ encrypted: encryptedBalance });
    } catch (error) {
      console.error('Failed to load balance', error);
      setBalance(null);
    }
  }, [address, publicClient, czamaConfigured]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleMint = useCallback(async () => {
    if (!address) {
      alert('Connect your wallet to mint an NFT.');
      return;
    }
    if (!configurationReady) {
      alert('Contract addresses are not configured yet.');
      return;
    }

    try {
      setMinting(true);
      const resolvedSigner = await signer;
      if (!resolvedSigner) {
        throw new Error('Unable to access signer');
      }

      const contract = new ethers.Contract(ZAMA_NFT_ADDRESS, ZAMA_NFT_ABI, resolvedSigner);
      const tx = await contract.mint();
      await tx.wait();

      await Promise.all([loadTokens(), loadBalance()]);
    } catch (error) {
      console.error('Mint failed', error);
      alert(`Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMinting(false);
    }
  }, [address, configurationReady, signer, loadTokens, loadBalance]);

  const handleClaim = useCallback(
    async (tokenId: bigint) => {
      if (!configurationReady) {
        alert('Contract addresses are not configured yet.');
        return;
      }

      setTokens((previous) =>
        previous.map((token) => (token.tokenId === tokenId ? { ...token, claiming: true } : token))
      );

      try {
        const resolvedSigner = await signer;
        if (!resolvedSigner) {
          throw new Error('Unable to access signer');
        }

        const contract = new ethers.Contract(ZAMA_NFT_ADDRESS, ZAMA_NFT_ABI, resolvedSigner);
        const tx = await contract.mintToken(tokenId);
        await tx.wait();

        await Promise.all([loadTokens(), loadBalance()]);
      } catch (error) {
        console.error('Claim failed', error);
        alert(`Claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setTokens((previous) =>
          previous.map((token) => (token.tokenId === tokenId ? { ...token, claiming: false } : token))
        );
      }
    },
    [configurationReady, signer, loadTokens, loadBalance]
  );

  const decryptWithRelayer = useCallback(
    async (contractAddress: string, handles: string[]): Promise<Record<string, string>> => {
      if (!instance || !address) {
        throw new Error('Relayer instance or address unavailable');
      }

      // Treat all-zero ciphertext handles as plaintext 0 without calling the relayer
      const isZeroHandle = (h: string) => {
        const raw = h.startsWith('0x') ? h.slice(2) : h;
        return raw.length > 0 && /^0+$/.test(raw);
      };

      const result: Record<string, string> = {};
      const nonZeroHandles = handles.filter((h) => {
        const zero = isZeroHandle(h);
        if (zero) result[h] = '0';
        return !zero;
      });

      if (nonZeroHandles.length === 0) {
        return result;
      }

      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      const resolvedSigner = await signer;
      if (!resolvedSigner) {
        throw new Error('Unable to access signer');
      }

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const handleContractPairs = nonZeroHandles.map((handle) => ({
        handle,
        contractAddress,
      }));

      const partial = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      // Merge decrypted non-zero results with zero-handle defaults
      for (const key of Object.keys(partial)) {
        result[key] = partial[key];
      }
      return result;
    },
    [instance, address, signer]
  );

  const handleDecryptToken = useCallback(
    async (tokenId: bigint, encryptedHandle: string) => {
      if (!instance) {
        alert('Encryption service not ready yet. Please retry in a moment.');
        return;
      }

      setTokens((previous) =>
        previous.map((token) => (token.tokenId === tokenId ? { ...token, decrypting: true } : token))
      );

      try {
        const decrypted = await decryptWithRelayer(ZAMA_NFT_ADDRESS, [encryptedHandle]);
        const allocation = Number(decrypted[encryptedHandle] ?? '0');

        setTokens((previous) =>
          previous.map((token) =>
            token.tokenId === tokenId
              ? { ...token, decryptedAllocation: allocation }
              : token
          )
        );
      } catch (error) {
        console.error('Decryption failed', error);
        alert(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setTokens((previous) =>
          previous.map((token) => (token.tokenId === tokenId ? { ...token, decrypting: false } : token))
        );
      }
    },
    [decryptWithRelayer, instance]
  );

  const handleDecryptBalance = useCallback(async () => {
    if (!balance || !instance) {
      alert('No balance to decrypt yet.');
      return;
    }

    setIsDecryptingBalance(true);
    try {
      const decrypted = await decryptWithRelayer(CONFIDENTIAL_ZAMA_ADDRESS, [balance.encrypted]);
      const value = Number(decrypted[balance.encrypted] ?? '0');
      setBalance({ encrypted: balance.encrypted, decrypted: value });
    } catch (error) {
      console.error('Balance decryption failed', error);
      alert(`Balance decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDecryptingBalance(false);
    }
  }, [balance, instance, decryptWithRelayer]);

  const emptyState = useMemo(() => tokens.length === 0, [tokens]);

  if (networkMismatch) {
    return <div className="dashboard__notice">Switch to Sepolia to use the Zama Mystery Vault.</div>;
  }

  if (!configurationReady) {
    return (
      <div className="dashboard__notice">
        Contract addresses are not configured. Set <code>VITE_ZAMA_NFT_ADDRESS</code> and <code>VITE_CZAMA_ADDRESS</code>
        in your environment after deploying to Sepolia.
      </div>
    );
  }

  if (!address) {
    return <div className="dashboard__notice">Connect your wallet to start minting encrypted NFTs.</div>;
  }

  return (
    <section className="dashboard">
      <div className="dashboard__actions">
        <div className="dashboard__summary">
          <h2>Mint encrypted NFTs</h2>
          <p>Each mint assigns a secret allocation of cZama tokens that only you can reveal.</p>
          <button type="button" onClick={handleMint} className="dashboard__mint" disabled={minting}>
            {minting ? 'Minting…' : 'Mint NFT'}
          </button>
        </div>

        <div className="dashboard__balance">
          <div className="dashboard__balance-row">
            <span className="dashboard__balance-label">Encrypted balance</span>
            <span className="dashboard__balance-value">
              {balance?.encrypted ?? '0x0'}
            </span>
          </div>
          <div className="dashboard__balance-row">
            <span className="dashboard__balance-label">Decrypted balance</span>
            <span className="dashboard__balance-highlight">
              {balance?.decrypted !== undefined ? `${balance.decrypted} cZama` : 'Hidden'}
            </span>
          </div>
          <button
            type="button"
            className="dashboard__decrypt"
            onClick={handleDecryptBalance}
            disabled={!balance || isDecryptingBalance || !instance}
          >
            {isDecryptingBalance ? 'Decrypting…' : 'Decrypt balance'}
          </button>
        </div>
      </div>

      {zamaError && (
        <div className="dashboard__notice dashboard__notice--warning">
          Encryption service initialisation error: {zamaError}
        </div>
      )}

      <div className="dashboard__tokens">
        {isLoadingTokens ? (
          <div className="dashboard__notice">Loading your NFTs…</div>
        ) : emptyState ? (
          <div className="dashboard__notice">Mint your first NFT to reveal a private cZama allocation.</div>
        ) : (
          tokens.map((token) => (
            <TokenCard
              key={token.tokenId.toString()}
              token={token}
              onClaim={handleClaim}
              onDecrypt={handleDecryptToken}
            />
          ))
        )}
      </div>
    </section>
  );
}
