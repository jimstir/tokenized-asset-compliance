// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "../libraries/TAFTypes.sol";

/**
 * @title IAttestationMerkleTree
 * @notice Standard interface for the EthSystems Attested Shielded Pool Merkle Tree.
 */
interface IAttestationMerkleTree {
    event AttestationLeafInserted(
        bytes32 indexed leaf,
        uint256 indexed ownerPubkey,
        address indexed attester,
        uint64 issuedAt,
        uint64 expiresAt,
        uint256 leafIndex
    );
    event MerkleRootUpdated(bytes32 indexed newRoot);

    function insertLeaf(TAFTypes.ShieldedAttestationLeaf calldata leafData) external returns (bytes32 leaf, bytes32 newRoot);
    function currentRoot() external view returns (bytes32);
    function isKnownRoot(bytes32 root) external view returns (bool);
    function totalLeaves() external view returns (uint256);
}
