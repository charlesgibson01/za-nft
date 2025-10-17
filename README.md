# Zama Mystery NFT

A decentralized application (DApp) that combines NFTs with fully homomorphic encryption (FHE) technology to create mystery reward NFTs. Each NFT contains an encrypted random allocation value that can be redeemed for confidential cZama tokens.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technical Advantages](#technical-advantages)
- [Technology Stack](#technology-stack)
- [Problems Solved](#problems-solved)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Deployment](#deployment)
- [Usage](#usage)
- [Testing](#testing)
- [Security Features](#security-features)
- [Future Roadmap](#future-roadmap)
- [License](#license)

## Overview

Zama Mystery NFT is a next-generation NFT platform that leverages Zama's Fully Homomorphic Encryption (FHE) technology to create NFTs with hidden reward values. Each minted NFT contains an encrypted random allocation (ranging from 1 to 100) that remains confidential until claimed. Upon claiming, users receive the corresponding amount of confidential cZama tokens (ERC-20 compatible confidential tokens).

This project demonstrates the power of on-chain privacy through FHE, allowing computations on encrypted data without ever exposing the underlying values.

## Key Features

### 1. **Encrypted Random Allocations**
- Each NFT receives a random encrypted allocation value (1-100 cZama tokens) at mint time
- The allocation value is encrypted using Zama's FHE technology
- Only the NFT owner can decrypt and view their allocation

### 2. **One-Time Reward Claim**
- NFT owners can claim their encrypted allocation exactly once
- Claiming mints the corresponding amount of confidential cZama tokens
- Once claimed, the NFT's reward status is permanently marked as redeemed

### 3. **Confidential Tokens (cZama)**
- ERC-20 compatible confidential fungible tokens
- All balances and transfers are encrypted on-chain
- Users can perform operations on encrypted balances without revealing amounts

### 4. **Fully On-Chain Randomness**
- Random allocations generated using block metadata (prevrandao, timestamp)
- Deterministic yet unpredictable randomness source
- No external oracles required

### 5. **Standard NFT Compliance**
- ERC-721 compliant NFT implementation
- Support for token URI metadata
- Compatible with standard NFT marketplaces and wallets

## Technical Advantages

### Privacy-First Design
- **Confidentiality**: Allocation amounts remain encrypted on-chain, visible only to authorized parties
- **On-Chain Privacy**: Unlike traditional privacy solutions that rely on off-chain computation, all encrypted data and operations occur on-chain
- **No Zero-Knowledge Proofs Required**: FHE eliminates the need for complex ZK circuits

### Scalable Privacy
- **Efficient Computation**: FHE allows computations directly on encrypted data
- **No Trusted Setup**: Unlike many ZK solutions, FHE doesn't require trusted setup ceremonies
- **Composability**: Encrypted values can be used in complex smart contract logic

### User Experience
- **Seamless Integration**: Works with existing wallets (MetaMask, Rainbow, etc.)
- **No Special Client Software**: Standard web3 interactions with added privacy
- **Transparent Operations**: Users can verify all operations while maintaining privacy

### Security Benefits
- **Encrypted by Default**: All sensitive values are encrypted at the protocol level
- **Access Control**: Fine-grained permission system for encrypted data
- **Audit Trail**: All operations are recorded on-chain while preserving privacy

## Technology Stack

### Smart Contract Layer
- **Solidity** `^0.8.27` - Smart contract programming language
- **Hardhat** `^2.26.0` - Development environment and testing framework
- **OpenZeppelin Contracts** - Battle-tested contract implementations (ERC-721, Ownable)
- **Zama fhEVM** `^0.8.0` - Fully Homomorphic Encryption smart contract library
- **TypeChain** `^8.3.2` - TypeScript bindings for smart contracts

### Frontend
- **React** `^19.1.1` - UI library
- **Vite** `^7.1.6` - Build tool and development server
- **TypeScript** `~5.8.3` - Type-safe JavaScript
- **RainbowKit** `^2.2.8` - Wallet connection UI
- **Wagmi** `^2.17.0` - React hooks for Ethereum
- **Viem** `^2.37.6` - TypeScript Ethereum library (for reading)
- **Ethers.js** `^6.15.0` - Ethereum library (for writing)
- **TanStack Query** `^5.89.0` - Data fetching and caching

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Solhint** - Solidity linting
- **Hardhat Deploy** - Deployment management
- **Mocha & Chai** - Testing framework

### Blockchain Infrastructure
- **Zama fhEVM Network** - FHE-enabled Ethereum compatible network
- **Sepolia Testnet** - Ethereum test network deployment
- **Zama Relayer SDK** `^0.2.0` - Decryption service for FHE operations

## Problems Solved

### 1. **On-Chain Privacy**
Traditional smart contracts expose all data publicly. This project demonstrates how FHE enables true on-chain privacy for sensitive values while maintaining transparency and verifiability.

### 2. **Trustless Random Rewards**
Many reward systems require trusted parties or complex oracle solutions. This project uses on-chain randomness with FHE to create verifiable yet unpredictable rewards without trusted intermediaries.

### 3. **Confidential Token Operations**
Standard ERC-20 tokens expose all balances and transfers. The cZama token demonstrates confidential token transfers where amounts remain encrypted.

### 4. **MEV Protection**
By encrypting allocation values, the system prevents front-running and MEV attacks that could exploit knowledge of high-value rewards.

### 5. **Privacy-Preserving NFT Utilities**
Traditional NFT utilities are transparent. This project shows how to add private utility layers to NFTs, enabling use cases like blind auctions, private raffles, and confidential rewards.

### 6. **Composable Privacy**
The encrypted allocation can be used in further smart contract computations, demonstrating how privacy can be maintained through complex DeFi operations.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ NFT Dashboard│  │ Wallet Connect│ │ Claim Rewards │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
              Viem (Read)      Ethers (Write)
                    │               │
                    └───────┬───────┘
                            │
┌─────────────────────────────────────────────────────────┐
│              Zama fhEVM Blockchain Network              │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         ZamaNFT Contract (ERC-721)             │    │
│  │  • Mint NFT with encrypted allocation          │    │
│  │  • Claim rewards (one-time)                    │    │
│  │  • Manage token URIs                           │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│  ┌────────────────▼───────────────────────────────┐    │
│  │    ConfidentialZama Token (Confidential ERC-20)│    │
│  │  • Encrypted balances                          │    │
│  │  • Confidential transfers                      │    │
│  │  • Controlled minting                          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Zama FHE Library                       │    │
│  │  • Encrypt/decrypt euint64                     │    │
│  │  • Access control management                   │    │
│  │  • Encrypted arithmetic operations             │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
            Zama Relayer SDK        │
                    │               │
                    └───────────────┘
```

### Data Flow

#### NFT Minting Flow
1. User calls `mint()` on ZamaNFT contract
2. Contract generates random value (1-100) using block metadata
3. Value is encrypted using FHE library → creates `euint64`
4. Encrypted allocation is stored in contract mapping
5. Access permissions granted to user and contract
6. NFT is minted with ERC-721 standard
7. Token URI is set with metadata
8. Event emitted with encrypted allocation

#### Reward Claim Flow
1. User calls `mintToken(tokenId)` on ZamaNFT
2. Contract verifies:
   - Token exists and is owned by caller
   - Reward hasn't been claimed previously
   - Encrypted allocation is valid
3. Grant FHE access permission to cZama contract
4. Call `mintEncrypted()` on ConfidentialZama contract
5. cZama mints encrypted amount to user's account
6. Mark reward as claimed in NFT contract
7. Emit reward claimed event

#### Token Balance Decryption (Frontend)
1. User requests to view their balance
2. Frontend connects to Zama Relayer
3. Request decryption permission via signature
4. Relayer decrypts value and returns to user
5. Display decrypted balance in UI

## Smart Contracts

### ZamaNFT.sol
Main NFT contract implementing ERC-721 with encrypted allocations.

**Key Functions:**
- `mint()` - Mint new NFT with random encrypted allocation
- `mintToken(uint256 tokenId)` - Claim cZama tokens for an NFT (one-time)
- `getEncryptedAllocation(uint256 tokenId)` - View encrypted allocation
- `isRewardClaimed(uint256 tokenId)` - Check if reward has been claimed
- `totalMinted()` - Get total number of minted NFTs
- `setBaseURI(string calldata)` - Update base URI for metadata

**Storage:**
- `_tokenAllocations` - Mapping of token ID to encrypted allocation (euint64)
- `_tokenRewardClaimed` - Mapping of token ID to claim status

**Events:**
- `AllocationAssigned(uint256 indexed tokenId, euint64 encryptedAmount)`
- `RewardClaimed(uint256 indexed tokenId, euint64 encryptedAmount)`

### ConfidentialZama.sol
Confidential ERC-20 token with encrypted balances.

**Key Functions:**
- `mintEncrypted(address to, euint64 amount)` - Mint encrypted tokens (minter only)
- `setMinter(address newMinter)` - Update authorized minter (owner only)
- Inherits all `ConfidentialFungibleToken` functions:
  - `confidentialTransfer(address to, euint64 amount)` - Transfer encrypted amounts
  - `confidentialBalanceOf(address account)` - Get encrypted balance

**Access Control:**
- Owner can set minter address
- Only designated minter can create new tokens
- Standard token holder permissions for transfers

**Events:**
- `MinterUpdated(address indexed previousMinter, address indexed newMinter)`

## Getting Started

### Prerequisites

- **Node.js** `>=20.0.0`
- **npm** `>=7.0.0`
- **Git**
- **Ethereum Wallet** (MetaMask recommended)
- **Sepolia ETH** (for testnet deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/zama-nft.git
cd zama-nft
```

2. **Install root dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd game
npm install
cd ..
```

4. **Configure environment variables**
Create a `.env` file in the root directory:
```env
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
INFURA_API_KEY=your_infura_api_key_here

# Deployer private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# NFT metadata base URI
ZAMA_NFT_BASE_URI=https://your-domain.com/api/token/

# Etherscan API key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### Running Locally

#### 1. Start Local Hardhat Node
```bash
npm run chain
```

This starts a local Ethereum node with fhEVM support.

#### 2. Deploy Contracts to Local Network
In a new terminal:
```bash
npm run deploy:localhost
```

This deploys both `ConfidentialZama` and `ZamaNFT` contracts.

#### 3. Run Tests
```bash
npm test
```

#### 4. Start Frontend Development Server
```bash
cd game
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Deployment

#### Deploy to Sepolia Testnet

1. **Ensure you have Sepolia ETH** in your deployer wallet

2. **Compile contracts**
```bash
npm run compile
```

3. **Run tests**
```bash
npm test
```

4. **Deploy to Sepolia**
```bash
npm run deploy:sepolia
```

5. **Verify contracts on Etherscan**
```bash
npm run verify:sepolia
```

6. **Update frontend contract addresses**
After deployment, update the contract addresses in `game/src/config/contracts.ts` with the deployed addresses from `deployments/sepolia/`.

7. **Build and deploy frontend**
```bash
cd game
npm run build
```

Deploy the `dist` folder to your hosting service (Netlify, Vercel, etc.)

## Usage

### For End Users

#### Minting an NFT

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Select your wallet provider (MetaMask, Rainbow, etc.)
   - Approve connection

2. **Mint NFT**
   - Click "Mint NFT" button
   - Confirm transaction in wallet
   - Wait for transaction confirmation
   - Your new NFT will appear in the dashboard

3. **View Encrypted Allocation**
   - The NFT card displays your encrypted allocation
   - Click "Decrypt" to view the actual value
   - Sign decryption request with your wallet
   - See the number of cZama tokens you can claim

4. **Claim Rewards**
   - Click "Claim Rewards" on your NFT card
   - Confirm transaction in wallet
   - Receive cZama tokens to your wallet
   - NFT will be marked as "Claimed"

5. **View cZama Balance**
   - Check your encrypted cZama token balance
   - Decrypt to see actual amount
   - Use cZama tokens in compatible DeFi protocols

### For Developers

#### Interacting with Contracts

```typescript
import { ethers } from 'ethers';
import { ZamaNFT__factory } from './types';

// Connect to contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const zamaNft = ZamaNFT__factory.connect(NFT_ADDRESS, signer);

// Mint NFT
const mintTx = await zamaNft.mint();
await mintTx.wait();

// Get token ID
const totalMinted = await zamaNft.totalMinted();
console.log(`Minted token ID: ${totalMinted}`);

// Check if claimed
const isClaimed = await zamaNft.isRewardClaimed(totalMinted);
console.log(`Is claimed: ${isClaimed}`);

// Claim rewards
if (!isClaimed) {
  const claimTx = await zamaNft.mintToken(totalMinted);
  await claimTx.wait();
  console.log('Rewards claimed!');
}
```

#### Working with Encrypted Values

```typescript
import { initFhevm, createInstance } from '@zama-fhe/relayer-sdk';

// Initialize FHE instance
await initFhevm();
const instance = await createInstance({
  chainId: CHAIN_ID,
  networkUrl: RPC_URL,
  gatewayUrl: GATEWAY_URL,
});

// Decrypt allocation
const encryptedAllocation = await zamaNft.getEncryptedAllocation(tokenId);
const decryptedValue = await instance.decrypt(
  NFT_ADDRESS,
  encryptedAllocation,
);
console.log(`Allocation: ${decryptedValue} cZama`);
```

## Testing

### Running Tests

Run the full test suite:
```bash
npm test
```

Run tests for specific contract:
```bash
npm test test/ZamaNFT.ts
```

Run with coverage:
```bash
npm run coverage
```

### Test Cases

**ZamaNFT Contract Tests:**
- ✓ Mints NFT with encrypted allocation
- ✓ Allocation value is within valid range (1-100)
- ✓ Owner can decrypt their allocation
- ✓ Owner can claim rewards once
- ✓ Cannot claim rewards twice
- ✓ Non-owner cannot claim rewards
- ✓ cZama balance matches allocation after claim
- ✓ Reward claimed status is correctly updated

**ConfidentialZama Contract Tests:**
- ✓ Only minter can mint tokens
- ✓ Owner can update minter address
- ✓ Encrypted balances work correctly
- ✓ Confidential transfers function properly
- ✓ Access control is properly enforced

## Security Features

### Smart Contract Security

1. **Access Control**
   - Ownable pattern for administrative functions
   - Minter role for token minting
   - Owner-only reward claiming

2. **Input Validation**
   - Zero address checks
   - Token existence verification
   - Claim status validation

3. **Reentrancy Protection**
   - Uses OpenZeppelin's battle-tested contracts
   - State updates before external calls
   - No recursive call vulnerabilities

4. **Integer Safety**
   - Solidity 0.8+ built-in overflow protection
   - Explicit range checks for random values

### Privacy Security

1. **Encrypted Storage**
   - All sensitive values stored as encrypted types (euint64)
   - No plaintext leakage on-chain

2. **Access Control Lists**
   - FHE permission system controls who can decrypt
   - Explicit permission granting required

3. **One-Way Operations**
   - Encrypted values cannot be reversed without permission
   - Computation results remain encrypted

### Frontend Security

1. **No Sensitive Data Storage**
   - No localStorage usage
   - No hardcoded private keys or secrets
   - All sensitive operations require wallet signatures

2. **Network Security**
   - Production frontend only connects to Sepolia testnet
   - No localhost network connections
   - Environment-specific configurations

## Future Roadmap

### Phase 1: Enhanced NFT Features (Q2 2025)
- [ ] Dynamic NFT metadata based on encrypted attributes
- [ ] NFT staking with encrypted reward multipliers
- [ ] Batch minting functionality
- [ ] Whitelist and allowlist minting
- [ ] Custom allocation ranges per mint phase

### Phase 2: Advanced Token Utilities (Q3 2025)
- [ ] cZama token staking pools
- [ ] Confidential DEX integration
- [ ] Encrypted voting mechanisms using cZama
- [ ] Confidential lending/borrowing protocols
- [ ] Cross-chain bridge for cZama tokens

### Phase 3: Marketplace & Trading (Q4 2025)
- [ ] Native NFT marketplace with encrypted offers
- [ ] Peer-to-peer trading with privacy
- [ ] Encrypted auction system
- [ ] Bulk NFT operations
- [ ] Rarity ranking system with private traits

### Phase 4: Gamification & Rewards (Q1 2026)
- [ ] Achievement system with encrypted progress
- [ ] Leaderboards with privacy-preserving scores
- [ ] Quest system with confidential rewards
- [ ] Referral program with encrypted bonuses
- [ ] Lottery system with verifiable randomness

### Phase 5: DAO & Governance (Q2 2026)
- [ ] DAO formation with cZama voting power
- [ ] Encrypted proposal voting
- [ ] Treasury management with private allocations
- [ ] Community-driven development fund
- [ ] Delegation system for voting power

### Phase 6: Ecosystem Expansion (Q3 2026)
- [ ] Mobile app (iOS & Android)
- [ ] Browser extension wallet integration
- [ ] API for third-party developers
- [ ] SDK for building on top of Zama Mystery NFT
- [ ] Partnerships with other FHE projects
- [ ] Multi-chain deployment (Ethereum mainnet, L2s)

### Technical Improvements
- [ ] Gas optimization for minting and claiming
- [ ] Improved randomness with Chainlink VRF integration
- [ ] Enhanced metadata storage (IPFS/Arweave)
- [ ] GraphQL API for historical data queries
- [ ] Real-time notification system
- [ ] Advanced analytics dashboard
- [ ] Automated contract upgrades system

### Research & Development
- [ ] Zero-knowledge proof integration for additional privacy layers
- [ ] Post-quantum cryptography exploration
- [ ] MEV protection mechanisms
- [ ] Confidential cross-contract composability patterns
- [ ] Scalability solutions for FHE operations
- [ ] Novel use cases for encrypted NFT utilities

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is properly formatted (`npm run prettier:write`)
- Linting passes (`npm run lint`)
- Smart contracts are documented
- Frontend components have proper TypeScript types

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Zama** - For pioneering FHE technology and providing the fhEVM framework
- **OpenZeppelin** - For secure and audited smart contract libraries
- **Hardhat** - For excellent development tooling
- **RainbowKit & Wagmi** - For seamless wallet integration
- **Ethereum Community** - For continuous innovation in blockchain technology

## Contact & Support

- **GitHub Issues**: [https://github.com/yourusername/zama-nft/issues](https://github.com/yourusername/zama-nft/issues)
- **Documentation**: [https://docs.zama.ai](https://docs.zama.ai)
- **Zama Discord**: [https://discord.gg/zama](https://discord.gg/zama)

## Resources

- [Zama Documentation](https://docs.zama.ai)
- [fhEVM GitHub](https://github.com/zama-ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [RainbowKit Documentation](https://www.rainbowkit.com)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

---

**Built with ❤️ using Zama FHE Technology**

*Making blockchain privacy practical and accessible for everyone.*
