import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'zama-mystery-demo';

export const config = getDefaultConfig({
  appName: 'Zama Mystery Vault',
  projectId,
  chains: [sepolia],
  ssr: false,
});
