// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/**
 * @title IZKVerifier
 * @notice Standard interface for evaluating Proof of Audit and participant membership proofs.
 */
interface IZKVerifier {
    /**
     * @notice Verifies an auditor's authorization proof for a shielded participant
     * @param auditor The address of the auditor (msg.sender)
     * @param ownerPubkey The participant's Baby Jubjub public key
     * @param proofOfAudit The ZK cryptographic proof payload
     */
    function verifyProofOfAudit(
        address auditor,
        uint256 ownerPubkey,
        bytes calldata proofOfAudit
    ) external view returns (bool);

    /**
     * @notice Verifies a participant's ZK membership proof against an attested Merkle root
     */
    function verifyMembershipProof(
        bytes32 merkleRoot,
        bytes32 nullifierHash,
        address targetWallet,
        bytes calldata zkp
    ) external view returns (bool);

    /**
     * @notice Verifies dual membership in Attestation Merkle Tree and non-membership in Revocation Tree.
     * @param attestationRoot The root of the Attestation Merkle Tree
     * @param revocationRoot The root of the Revocation Tree
     * @param attestationType Required claim type hash
     * @param minValidTimestamp Timestamp bound check
     * @param zkProof The ZK proof payload
     */
    function verifyEligibilityProof(
        bytes32 attestationRoot,
        bytes32 revocationRoot,
        bytes32 attestationType,
        uint256 minValidTimestamp,
        bytes calldata zkProof
    ) external view returns (bool);
}

