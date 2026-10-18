// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "./libraries/TAFTypes.sol";
import {Poseidon5} from "./libraries/Poseidon5.sol";
import {IAttestationMerkleTree} from "./interfaces/IAttestationMerkleTree.sol";

/**
 * @title AttestationMerkleTree
 * @notice Incremental Merkle tree for shielded attestations based on EthSystems Spec 3.
 *         Maintains a ring buffer of recent roots to handle concurrency and prevent front-running reverts.
 */
contract AttestationMerkleTree is IAttestationMerkleTree {
    uint256 public constant TREE_DEPTH = 20; // 2^20 capacity (~1,000,000 leaves)
    uint256 public constant ROOT_HISTORY_SIZE = 50; // Ring buffer of recent valid roots

    uint256 private _nextLeafIndex;
    bytes32 private _currentRoot;
    bytes32[ROOT_HISTORY_SIZE] private _rootHistory;
    uint256 private _rootHistoryIndex;

    // Zero values for empty subtrees
    bytes32[TREE_DEPTH] private _zeros;
    // Filled subtrees caching the current rightmost frontier
    bytes32[TREE_DEPTH] private _filledSubtrees;

    // Contract owner authorized to configure registry
    address public owner;
    // Authorized registry that can insert leaves
    address public attestationRegistry;

    error OnlyRegistryAllowed();
    error MerkleTreeFull();
    error Unauthorized();

    modifier onlyRegistry() {
        if (msg.sender != attestationRegistry) {
            revert OnlyRegistryAllowed();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        // Initialize zero values for incremental tree
        bytes32 currentZero = bytes32(0);
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            _zeros[i] = currentZero;
            _filledSubtrees[i] = currentZero;
            currentZero = keccak256(abi.encodePacked(currentZero, currentZero));
        }
        _currentRoot = currentZero;
        _rootHistory[0] = currentZero;
    }

    function setAttestationRegistry(address registry) external {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        require(registry != address(0), "Zero address");
        require(attestationRegistry == address(0), "Registry already set");
        attestationRegistry = registry;
    }

    /**
     * @notice Inserts a new shielded attestation leaf into the Merkle tree.
     */
    function insertLeaf(
        TAFTypes.ShieldedAttestationLeaf calldata leafData
    ) external override onlyRegistry returns (bytes32 leaf, bytes32 newRoot) {
        if (_nextLeafIndex >= 2 ** TREE_DEPTH) {
            revert MerkleTreeFull();
        }

        // Compute Poseidon5 leaf: binding ownerPubkey, attestationType, attester, issuedAt, expiresAt
        leaf = Poseidon5.hash(
            leafData.ownerPubkey,
            leafData.attestationType,
            leafData.attester,
            leafData.issuedAt,
            leafData.expiresAt
        );

        uint256 currentIndex = _nextLeafIndex;
        bytes32 currentLevelHash = leaf;

        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            if (currentIndex % 2 == 0) {
                _filledSubtrees[i] = currentLevelHash;
                currentLevelHash = keccak256(abi.encodePacked(currentLevelHash, _zeros[i]));
            } else {
                currentLevelHash = keccak256(abi.encodePacked(_filledSubtrees[i], currentLevelHash));
            }
            currentIndex /= 2;
        }

        newRoot = currentLevelHash;
        _currentRoot = newRoot;

        // Record in historical ring buffer
        _rootHistoryIndex = (_rootHistoryIndex + 1) % ROOT_HISTORY_SIZE;
        _rootHistory[_rootHistoryIndex] = newRoot;

        emit AttestationLeafInserted(
            leaf,
            leafData.ownerPubkey,
            leafData.attester,
            leafData.issuedAt,
            leafData.expiresAt,
            _nextLeafIndex
        );
        emit MerkleRootUpdated(newRoot);

        _nextLeafIndex++;
        return (leaf, newRoot);
    }

    function currentRoot() external view override returns (bytes32) {
        return _currentRoot;
    }

    function isKnownRoot(bytes32 root) external view override returns (bool) {
        if (root == bytes32(0)) return false;
        if (root == _currentRoot) return true;

        for (uint256 i = 0; i < ROOT_HISTORY_SIZE; i++) {
            if (_rootHistory[i] == root) {
                return true;
            }
        }
        return false;
    }

    function totalLeaves() external view override returns (uint256) {
        return _nextLeafIndex;
    }
}
