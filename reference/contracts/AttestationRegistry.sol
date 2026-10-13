// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "./libraries/TAFTypes.sol";
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";
import {IProfileRegistry} from "./interfaces/IProfileRegistry.sol";
import {IAttestationMerkleTree} from "./interfaces/IAttestationMerkleTree.sol";
import {IZKVerifier} from "./interfaces/IZKVerifier.sol";

/**
 * @title AttestationRegistry
 * @notice Central registry for issuing, indexing, tagging, and revoking compliance claims in TAF.
 */
contract AttestationRegistry is IAttestationRegistry {
    IProfileRegistry public immutable profileRegistry;
    IAttestationMerkleTree public immutable merkleTree;
    IZKVerifier public immutable zkVerifier;

    // Mapping from attestationId => Attestation
    mapping(bytes32 => TAFTypes.Attestation) private _attestations;

    // Tagging Map: subjectIdentifier => attestationType => attestor => attestationId
    mapping(bytes32 => mapping(bytes32 => mapping(address => bytes32))) private _taggingMaps;

    // Optional delegation for revocations: attestor => delegate => authorized
    mapping(address => mapping(address => bool)) public revocationDelegates;

    error NotAuthorizedAttestor(address caller);
    error AttestationAlreadyExists(bytes32 id);
    error AttestationDoesNotExist(bytes32 id);
    error InitialRevocationMustBeFalse();
    error UnauthorizedRevoker(address caller, address attestor);
    error UnauthorizedAuditor();

    constructor(
        address profileRegistryAddress,
        address merkleTreeAddress,
        address zkVerifierAddress
    ) {
        profileRegistry = IProfileRegistry(profileRegistryAddress);
        merkleTree = IAttestationMerkleTree(merkleTreeAddress);
        zkVerifier = IZKVerifier(zkVerifierAddress);
    }

    function setRevocationDelegate(address delegate, bool authorized) external {
        revocationDelegates[msg.sender][delegate] = authorized;
    }

    /**
     * @notice Submits a transparent compliance attestation
     */
    function submitAttestation(
        TAFTypes.Attestation calldata attestation
    ) external override returns (bytes32 id) {
        // Must be an active registered Entity
        if (!profileRegistry.isRegisteredEntity(msg.sender)) {
            revert NotAuthorizedAttestor(msg.sender);
        }

        if (attestation.revoked) {
            revert InitialRevocationMustBeFalse();
        }

        uint256 attestedTime = attestation.attestedAt == 0 ? block.timestamp : attestation.attestedAt;

        // Deterministic ID generation based on EthSystems ported leaf parameters + attestationType
        id = keccak256(
            abi.encode(
                attestation.subjectIdentifier,
                msg.sender,
                attestation.attestationType,
                attestedTime,
                attestation.validUntil
            )
        );

        if (_attestations[id].id != bytes32(0)) {
            revert AttestationAlreadyExists(id);
        }

        TAFTypes.Attestation memory record = TAFTypes.Attestation({
            id: id,
            attestor: msg.sender,
            attestedAt: attestedTime,
            validUntil: attestation.validUntil,
            subjectIdentifier: attestation.subjectIdentifier,
            attestationType: attestation.attestationType,
            visibility: TAFTypes.VisibilityPreference.TRANSPARENT,
            revoked: false,
            evidenceHash: attestation.evidenceHash,
            evidenceURI: attestation.evidenceURI,
            signature: attestation.signature,
            resultData: attestation.resultData
        });

        _attestations[id] = record;

        // Update Tagging Map for O(1) query discovery
        _taggingMaps[attestation.subjectIdentifier][attestation.attestationType][msg.sender] = id;

        emit AttestationSubmitted(id, msg.sender, attestation.subjectIdentifier, attestation.attestationType);
        return id;
    }

    /**
     * @notice Submits an attestation for a SHIELDED participant with cryptographic proof of audit.
     */
    function submitShieldedAttestation(
        uint256 ownerPubkey,
        bytes32 attestationType,
        uint64 validUntil,
        bytes calldata proofOfAudit
    ) external override returns (bytes32 leaf) {
        if (!profileRegistry.isRegisteredEntity(msg.sender)) {
            revert NotAuthorizedAttestor(msg.sender);
        }

        // Evaluate cryptographic proof of audit against caller (msg.sender) and target ownerPubkey
        bool isValidProof = zkVerifier.verifyProofOfAudit(msg.sender, ownerPubkey, proofOfAudit);
        if (!isValidProof) {
            revert UnauthorizedAuditor();
        }

        // Insert into Shielded Merkle Tree
        TAFTypes.ShieldedAttestationLeaf memory leafData = TAFTypes.ShieldedAttestationLeaf({
            ownerPubkey: ownerPubkey,
            attester: msg.sender,
            issuedAt: uint64(block.timestamp),
            expiresAt: validUntil
        });

        bytes32 newRoot;
        (leaf, newRoot) = merkleTree.insertLeaf(leafData);

        // Tagging map for shielded key
        bytes32 subjectId = bytes32(ownerPubkey);
        _taggingMaps[subjectId][attestationType][msg.sender] = leaf;

        emit AttestationSubmitted(leaf, msg.sender, subjectId, attestationType);
        return leaf;
    }

    /**
     * @notice Revokes an active attestation
     */
    function revokeAttestation(bytes32 attestationId) external override {
        TAFTypes.Attestation storage record = _attestations[attestationId];
        if (record.id == bytes32(0)) {
            revert AttestationDoesNotExist(attestationId);
        }

        // Enforce revocation authority (only attestor or authorized delegate)
        if (msg.sender != record.attestor && !revocationDelegates[record.attestor][msg.sender]) {
            revert UnauthorizedRevoker(msg.sender, record.attestor);
        }

        record.revoked = true;
        emit AttestationRevoked(attestationId, msg.sender);
    }

    function getAttestation(bytes32 attestationId) external view override returns (TAFTypes.Attestation memory) {
        return _attestations[attestationId];
    }

    function getTaggedAttestationId(
        bytes32 subjectIdentifier,
        bytes32 attestationType,
        address attestor
    ) external view override returns (bytes32) {
        return _taggingMaps[subjectIdentifier][attestationType][attestor];
    }

    function isAttestationValid(bytes32 attestationId) external view override returns (bool) {
        TAFTypes.Attestation memory record = _attestations[attestationId];
        if (record.id == bytes32(0) || record.revoked) {
            return false;
        }
        if (record.validUntil != 0 && block.timestamp > record.validUntil) {
            return false;
        }
        return true;
    }
}
