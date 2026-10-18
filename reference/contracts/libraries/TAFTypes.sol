// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/**
 * @title TAFTypes
 * @notice Standard types, enums, and structs for the Tokenization Assurance Framework (TAF).
 */
library TAFTypes {
    /// @notice Visibility mode for profiles and attestations
    enum VisibilityPreference {
        TRANSPARENT,
        SHIELDED
    }

    /// @notice Deterministic Verification States for tokenized assets
    enum VerificationState {
        UNVERIFIED,
        VERIFIED,
        STALE,
        REVOKED
    }

    /// @notice Entity Profile representing issuers, custodians, auditors, and operators
    struct ENTITY {
        address owner;
        bool operator; // Flag indicating if profile operates a tokenized offering
        bytes32 did; // Optional W3C Decentralized Identifier or hash (e.g. did:web CID)
        VisibilityPreference visibility;
        bytes32 legalDocumentHash; // Hash of operational/incorporation documents
        bytes32[] attestationIds; // Linked attestations for entity accreditation
        bool status; // Active status of entity
    }

    /// @notice Immutable identity binding for a tokenized asset
    struct AssetId {
        bytes32 assetId;
        uint256 chainId;
        address issuer;
        address tokenContract;
    }

    /// @notice Dynamic compliance metadata and rights links for an asset
    struct AssetMetadata {
        bytes32 assetId;
        uint256 timestamp;
        uint256 representationRatio; // Required backing ratio (e.g. 1:1 = 1, 1:10 = 10)
        bytes32[] attestationIds; // Supporting attestation IDs (e.g. custody reserves)
        // Core tokenholder rights linked via specific attestation IDs
        bytes32 redemptionRightAttestationId;
        bytes32 insolvencyProtection;
        bytes32 nativeOwnership;
        address[] extensionMetadata; // Modular adapter contract addresses
    }

    /// @notice Complete Asset Profile
    struct ASSET {
        AssetId id;
        AssetMetadata metadata;
        bool status;
    }

    /// @notice Participant profile (retail or institutional tokenholder)
    struct PARTICIPANT {
        address user;
        uint256 participantType; // Standardized participant classification
        bytes32 shieldedKeyHash; // Poseidon hash of owner_pubkey for shielded users
        VisibilityPreference visibility;
        bytes32 jurisdiction; // ISO country code or jurisdiction hash
        bytes32[] identityAttestationIds; // Linked KYC/eligibility attestation IDs
    }

    /// @notice Universal Attestation Schema
    struct Attestation {
        bytes32 id; // Deterministic unique identifier
        address attestor; // Authorized Entity address that verified and signed claim
        uint256 attestedAt; // Timestamp of issuance
        uint256 validUntil; // Expiration timestamp (0 = no expiration)
        bytes32 subjectIdentifier; // Target identifier (DID, AssetId, or owner_pubkey)
        bytes32 attestationType; // Standardized claim type hash (e.g., keccak256("CUSTODY_VERIFIED"))
        VisibilityPreference visibility; // Transparent or Shielded
        bool revoked; // Revocation flag
        bytes32 evidenceHash; // Cryptographic hash of off-chain source evidence
        string evidenceURI; // IPFS CID or HTTPS URL to off-chain document
        bytes signature; // EIP-712 / EIP-1271 signature
        bytes resultData; // Optional ABI-encoded quantitative data (e.g., reserve quantities)
    }

    /// @notice Leaf format for EthSystems Attested Shielded Pool Merkle Tree
    struct ShieldedAttestationLeaf {
        uint256 ownerPubkey; // Baby Jubjub spending public key of participant
        bytes32 attestationType; // Standardized claim type hash
        address attester; // Compliance authority address
        uint64 issuedAt; // Issuance timestamp
        uint64 expiresAt; // Expiration timestamp
    }
}
