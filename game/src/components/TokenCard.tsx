import '../styles/TokenCard.css';

export type TokenInfo = {
  tokenId: bigint;
  encryptedAllocation: string;
  isClaimed: boolean;
  decryptedAllocation?: number;
  claiming: boolean;
  decrypting: boolean;
};

type TokenCardProps = {
  token: TokenInfo;
  onClaim: (tokenId: bigint) => void;
  onDecrypt: (tokenId: bigint, encryptedHandle: string) => void;
};

export function TokenCard({ token, onClaim, onDecrypt }: TokenCardProps) {
  const shortHandle = `${token.encryptedAllocation.slice(0, 10)}…${token.encryptedAllocation.slice(-6)}`;

  return (
    <div className="token-card">
      <div className="token-card__header">
        <h3>Token #{token.tokenId.toString()}</h3>
        <span className={`token-card__status ${token.isClaimed ? 'token-card__status--claimed' : 'token-card__status--locked'}`}>
          {token.isClaimed ? 'Reward claimed' : 'Reward locked'}
        </span>
      </div>

      <div className="token-card__body">
        <div className="token-card__row">
          <span className="token-card__label">Encrypted allocation</span>
          <span className="token-card__value" title={token.encryptedAllocation}>{shortHandle}</span>
        </div>

        <div className="token-card__row">
          <span className="token-card__label">Decrypted value</span>
          <span className="token-card__value token-card__value--highlight">
            {token.decryptedAllocation !== undefined ? `${token.decryptedAllocation} cZama` : 'Hidden'}
          </span>
        </div>
      </div>

      <div className="token-card__actions">
        <button
          type="button"
          className="token-card__button"
          onClick={() => onDecrypt(token.tokenId, token.encryptedAllocation)}
          disabled={token.decrypting}
        >
          {token.decrypting ? 'Decrypting…' : 'Decrypt allocation'}
        </button>
        <button
          type="button"
          className="token-card__button token-card__button--primary"
          onClick={() => onClaim(token.tokenId)}
          disabled={token.isClaimed || token.claiming}
        >
          {token.claiming ? 'Claiming…' : token.isClaimed ? 'Already claimed' : 'Claim cZama'}
        </button>
      </div>
    </div>
  );
}
