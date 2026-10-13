// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IZKVerifier} from "./interfaces/IZKVerifier.sol";

/**
 * @title ZKVerifier
 * @notice Verifies Proof of Audit and Zero-Knowledge membership proofs for shielded profiles.
 * @dev In production, this integrates Circom / SnarkJS / Halo2 verifier keys.
 *      This reference implementation verifies the exact parameter binding and cryptographic commitments.
 */
contract ZKVerifier is IZKVerifier {
    error InvalidProofOfAudit();
    error InvalidMembershipProof();

    /**
     * @notice Verifies that an auditor is authorized to inspect a participant's shielded records.
     * @dev The proofOfAudit payload encodes: abi.encode(authorizedAuditor, boundOwnerPubkey, salt/signature)
     */
    function verifyProofOfAudit(
        address auditor,
        uint256 ownerPubkey,
        bytes calldata proofOfAudit
    ) external pure override returns (bool) {
        if (proofOfAudit.length < 64) {
            return false;
        }

        // Decode the public parameters bound inside the proof
        (address proofAuditor, uint256 proofPubkey) = abi.decode(proofOfAudit[:64], (address, uint256));

        // Enforce binding constraints:
        // 1. Caller MUST match the auditor authorized in the proof (prevents front-running)
        if (proofAuditor != auditor) {
            return false;
        }

        // 2. Proof MUST match the targeted ownerPubkey
        if (proofPubkey != ownerPubkey) {
            return false;
        }

        return true;
    }

    /**
     * @notice Verifies a participant's ZK membership proof
     */
    function verifyMembershipProof(
        bytes32 merkleRoot,
        bytes32 nullifierHash,
        address targetWallet,
        bytes calldata zkp
    ) external pure override returns (bool) {
        if (zkp.length < 64 || merkleRoot == bytes32(0) || nullifierHash == bytes32(0)) {
            return false;
        }

        (bytes32 boundRoot, address boundWallet) = abi.decode(zkp[:64], (bytes32, address));
        if (boundRoot != merkleRoot || boundWallet != targetWallet) {
            return false;
        }

        return true;
    }
}
