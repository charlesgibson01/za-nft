// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC721, ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ConfidentialZama} from "./ConfidentialZama.sol";

contract ZamaNFT is ERC721URIStorage, Ownable, SepoliaConfig {
    uint256 private constant MIN_ALLOCATION = 1;
    uint256 private constant MAX_ALLOCATION = 100;

    ConfidentialZama public immutable czama;

    uint256 private _nextTokenId;
    string private _baseTokenURI;

    mapping(uint256 tokenId => euint64) private _tokenAllocations;
    mapping(uint256 tokenId => bool) private _tokenRewardClaimed;

    event AllocationAssigned(uint256 indexed tokenId, euint64 encryptedAmount);
    event RewardClaimed(uint256 indexed tokenId, euint64 encryptedAmount);

    error ZamaNFTAlreadyClaimed(uint256 tokenId);
    error ZamaNFTInvalidToken(uint256 tokenId);
    error ZamaNFTInvalidCzama(address czamaAddress);
    error ZamaNFTUnauthorized(address caller, uint256 tokenId);

    constructor(address czamaAddress, string memory baseTokenURI) ERC721("Zama Mystery", "ZAMA") Ownable(msg.sender) {
        if (czamaAddress == address(0)) {
            revert ZamaNFTInvalidCzama(czamaAddress);
        }
        czama = ConfidentialZama(czamaAddress);
        _baseTokenURI = baseTokenURI;
    }

    function setBaseURI(string calldata newBaseTokenURI) external onlyOwner {
        _baseTokenURI = newBaseTokenURI;
    }

    function mint() external returns (uint256 tokenId, euint64 encryptedAllocation) {
        tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        uint256 randomValue = _drawRandomValue(tokenId, msg.sender);
        encryptedAllocation = FHE.asEuint64(uint64(randomValue));
        FHE.allowThis(encryptedAllocation);
        FHE.allow(encryptedAllocation, msg.sender);

        _tokenAllocations[tokenId] = encryptedAllocation;

        _setTokenURI(tokenId, string.concat(_baseTokenURI, Strings.toString(tokenId)));

        emit AllocationAssigned(tokenId, encryptedAllocation);
    }

    function mintToken(uint256 tokenId) external returns (euint64 mintedAmount) {
        _ensureMinted(tokenId);

        if (ownerOf(tokenId) != msg.sender) {
            revert ZamaNFTUnauthorized(msg.sender, tokenId);
        }

        if (_tokenRewardClaimed[tokenId]) {
            revert ZamaNFTAlreadyClaimed(tokenId);
        }

        euint64 allocation = _tokenAllocations[tokenId];
        if (!FHE.isInitialized(allocation)) {
            revert ZamaNFTInvalidToken(tokenId);
        }

        _tokenRewardClaimed[tokenId] = true;

        FHE.allow(allocation, address(czama));
        mintedAmount = czama.mintEncrypted(msg.sender, allocation);

        emit RewardClaimed(tokenId, mintedAmount);
    }

    function getEncryptedAllocation(uint256 tokenId) external view returns (euint64) {
        _ensureMinted(tokenId);
        return _tokenAllocations[tokenId];
    }

    function isRewardClaimed(uint256 tokenId) external view returns (bool) {
        _ensureMinted(tokenId);
        return _tokenRewardClaimed[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function _drawRandomValue(uint256 tokenId, address minter) private view returns (uint256) {
        uint256 randomness = uint256(
            keccak256(abi.encodePacked(block.prevrandao, block.timestamp, minter, tokenId, address(this)))
        );
        uint256 span = MAX_ALLOCATION - MIN_ALLOCATION + 1;
        return (randomness % span) + MIN_ALLOCATION;
    }

    function _ensureMinted(uint256 tokenId) private view {
        if (_ownerOf(tokenId) == address(0)) {
            revert ZamaNFTInvalidToken(tokenId);
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
