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

    // Mapping from shielded leaf => issuing ENTITY attester address
    mapping(bytes32 => address) public shieldedAttesters;

    // Mapping from shielded leaf => revocation status
    mapping(bytes32 => bool) public isShieldedLeafRevoked;

    // Current Revocation Tree root
    bytes32 public currentRevocationRoot;

    // Optional delegation for revocations: attestor => delegate => authorized
    mapping(address => mapping(address => bool)) public revocationDelegates;

    error NotAuthorizedAttestor(address caller);
    error AttestationAlreadyExists(bytes32 id);
    error AttestationDoesNotExist(bytes32 id);
    error ShieldedLeafAlreadyRevoked(bytes32 leaf);
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
     *         Shielded attestations are EXEMPT from on-chain relational tagging maps.
     */
    function submitShieldedAttestation(
        uint256 ownerPubkey,
        bytes32 attestationType,
        uint64 issuedAt,
        uint64 expiresAt,
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

        uint64 issuedTime = issuedAt == 0 ? uint64(block.timestamp) : issuedAt;

        // Insert into Shielded Merkle Tree
        TAFTypes.ShieldedAttestationLeaf memory leafData = TAFTypes.ShieldedAttestationLeaf({
            ownerPubkey: ownerPubkey,
            attestationType: attestationType,
            attester: msg.sender,
            issuedAt: issuedTime,
            expiresAt: expiresAt
        });

        bytes32 newRoot;
        (leaf, newRoot) = merkleTree.insertLeaf(leafData);

        // Record issuing ENTITY address against the leaf value to enforce access control
        shieldedAttesters[leaf] = msg.sender;

        // Shielded attestations MUST BE EXEMPT from on-chain relational Tagging Maps.
        // A shielded attestation MUST NEVER be stored or indexed by owner_pubkey or attestationType in contract storage.

        emit AttestationSubmitted(leaf, msg.sender, bytes32(ownerPubkey), attestationType);
        return leaf;
    }

    /**
     * @notice Revokes a shielded attestation leaf, adding it to the Revocation Tree
     */
    function revokeShieldedAttestation(bytes32 leaf) external override returns (bytes32 newRevocationRoot) {
        address attester = shieldedAttesters[leaf];
        if (attester == address(0)) {
            revert AttestationDoesNotExist(leaf);
        }

        if (msg.sender != attester && !revocationDelegates[attester][msg.sender]) {
            revert UnauthorizedRevoker(msg.sender, attester);
        }

        if (isShieldedLeafRevoked[leaf]) {
            revert ShieldedLeafAlreadyRevoked(leaf);
        }

        isShieldedLeafRevoked[leaf] = true;
        newRevocationRoot = keccak256(abi.encodePacked(currentRevocationRoot, leaf));
        currentRevocationRoot = newRevocationRoot;

        emit ShieldedAttestationRevoked(leaf, attester, newRevocationRoot);
        return newRevocationRoot;
    }

    /**
     * @notice Revokes an active transparent attestation
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

    function isShieldedAttestationRevoked(bytes32 leaf) external view override returns (bool) {
        return isShieldedLeafRevoked[leaf];
    }

    function getShieldedAttester(bytes32 leaf) external view override returns (address) {
        return shieldedAttesters[leaf];
    }
}
