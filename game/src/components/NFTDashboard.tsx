import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseAbiItem } from 'viem';
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
const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');

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
  const nftConfigured = ZAMA_NFT_ADDRESS !== ZERO_ADDRESS;
  const czamaConfigured = CONFIDENTIAL_ZAMA_ADDRESS !== ZERO_ADDRESS;

  const configurationReady = nftConfigured && czamaConfigured;

  const loadTokens = useCallback(async () => {
    if (!address || !publicClient || !nftConfigured) {
      setTokens([]);
      return;
    }

    setIsLoadingTokens(true);
    try {
      const logs = await publicClient.getLogs({
        address: ZAMA_NFT_ADDRESS,
        event: transferEvent,
        args: { to: address },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const uniqueIds = Array.from(
        new Set(
          logs
            .map((log) => log.args?.tokenId as bigint | undefined)
            .filter((id): id is bigint => id !== undefined)
        )
      );

      if (uniqueIds.length === 0) {
        setTokens([]);
        return;
      }

      const tokenDetails = await Promise.all(
        uniqueIds.map(async (tokenId) => {
          try {
            const owner = (await publicClient.readContract({
              address: ZAMA_NFT_ADDRESS,
              abi: ZAMA_NFT_ABI,
              functionName: 'ownerOf',
              args: [tokenId],
            })) as string;

            if (owner.toLowerCase() !== address.toLowerCase()) {
              return null;
            }

            const [encryptedAllocation, isClaimed] = await Promise.all([
              publicClient.readContract({
                address: ZAMA_NFT_ADDRESS,
                abi: ZAMA_NFT_ABI,
                functionName: 'getEncryptedAllocation',
                args: [tokenId],
              }),
              publicClient.readContract({
                address: ZAMA_NFT_ADDRESS,
                abi: ZAMA_NFT_ABI,
                functionName: 'isRewardClaimed',
                args: [tokenId],
              }),
            ]);

            return {
              tokenId,
              encryptedAllocation: encryptedAllocation as string,
              isClaimed: Boolean(isClaimed),
            };
          } catch (error) {
            console.error('Failed to load token data', error);
            return null;
          }
        })
      );

      const filtered = tokenDetails.filter((token): token is { tokenId: bigint; encryptedAllocation: string; isClaimed: boolean } => token !== null);

      setTokens((previous) =>
        filtered.map((token) => {
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

      const handleContractPairs = handles.map((handle) => ({
        handle,
        contractAddress,
      }));

      return instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );
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
