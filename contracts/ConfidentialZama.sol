// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "confidential-contracts-v91/contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ConfidentialZama is ERC7984, ZamaEthereumConfig, Ownable {
    address public minter;

    event MinterUpdated(address indexed previousMinter, address indexed newMinter);

    error ConfidentialZamaInvalidMinter(address minterCandidate);
    error ConfidentialZamaInvalidRecipient(address recipient);

    constructor() ERC7984("cZama", "cZama", "") Ownable(msg.sender) {
        minter = msg.sender;
        emit MinterUpdated(address(0), msg.sender);
    }

    modifier onlyMinter() {
        if (msg.sender != minter) {
            revert ConfidentialZamaInvalidMinter(msg.sender);
        }
        _;
    }

    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) {
            revert ConfidentialZamaInvalidMinter(newMinter);
        }

        address previous = minter;
        minter = newMinter;
        emit MinterUpdated(previous, newMinter);
    }

    function mintEncrypted(address to, euint64 amount) external onlyMinter returns (euint64 mintedAmount) {
        if (to == address(0)) {
            revert ConfidentialZamaInvalidRecipient(to);
        }

        FHE.allowThis(amount);
        FHE.allow(amount, to);
        mintedAmount = _mint(to, amount);
    }
}
