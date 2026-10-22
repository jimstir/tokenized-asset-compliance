// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MockEIP1271Wallet
 * @notice Mock smart contract wallet verifying signatures via EIP-1271.
 */
contract MockEIP1271Wallet is IERC1271 {
    address public owner;

    // EIP-1271 magic value
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    constructor(address _owner) {
        owner = _owner;
    }

    function setOwner(address _newOwner) external {
        require(msg.sender == owner, "Only owner");
        owner = _newOwner;
    }

    function execute(address target, bytes calldata data) external returns (bytes memory) {
        require(msg.sender == owner, "Only owner");
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        return result;
    }

    /**
     * @notice Validates whether a signature is valid for the provided hash.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4) {
        address signer = ECDSA.recover(hash, signature);
        if (signer == owner) {
            return MAGICVALUE;
        }
        return 0xffffffff;
    }
}
