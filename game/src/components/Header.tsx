import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">Zama Mystery Vault</h1>
        <p className="header__subtitle">Mint encrypted NFTs and unlock private cZama rewards</p>
      </div>
      <ConnectButton />
    </header>
  );
}
