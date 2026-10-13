// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "./libraries/TAFTypes.sol";
import {IVerificationEngine} from "./interfaces/IVerificationEngine.sol";
import {IProfileRegistry} from "./interfaces/IProfileRegistry.sol";
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";

interface IERC20Supply {
    function totalSupply() external view returns (uint256);
}

/**
 * @title VerificationEngine
 * @notice Core evaluation engine and state machine for the Tokenization Assurance Framework (TAF).
 *         Computes dynamic STALE states, evaluates representation ratios, and enforces policy.
 */
contract VerificationEngine is IVerificationEngine {
    IProfileRegistry public immutable profileRegistry;
    IAttestationRegistry public immutable attestationRegistry;

    // Optional override for profile-level revocations
    mapping(bytes32 => bool) public explicitlyRevokedProfiles;

    error AssetNotFound(bytes32 assetId);

    constructor(address profileRegistryAddress, address attestationRegistryAddress) {
        profileRegistry = IProfileRegistry(profileRegistryAddress);
        attestationRegistry = IAttestationRegistry(attestationRegistryAddress);
    }

    function setExplicitProfileRevocation(bytes32 assetId, bool isRevoked) external {
        // In production, gated to authorized governance or compliance entity
        explicitlyRevokedProfiles[assetId] = isRevoked;
    }

    /**
     * @notice Evaluates the current VerificationState for a tokenized asset.
     */
    function evaluateVerificationState(bytes32 assetId) public view override returns (TAFTypes.VerificationState) {
        VerificationReport memory report = getVerificationReport(assetId);
        return report.state;
    }

    /**
     * @notice Generates a full verification report and computes the active state.
     */
    function getVerificationReport(bytes32 assetId) public view override returns (VerificationReport memory) {
        TAFTypes.ASSET memory asset = profileRegistry.getAsset(assetId);
        if (asset.id.assetId == bytes32(0)) {
            revert AssetNotFound(assetId);
        }

        // 1. Explicit profile revocation takes precedence
        if (explicitlyRevokedProfiles[assetId] || !asset.isActive) {
            return _buildReport(asset, 0, 0, TAFTypes.VerificationState.REVOKED, false, false, false);
        }

        // 2. Query token supply
        uint256 tokenSupply = 0;
        if (asset.id.tokenContract != address(0)) {
            try IERC20Supply(asset.id.tokenContract).totalSupply() returns (uint256 supply) {
                tokenSupply = supply;
            } catch {
                tokenSupply = 0;
            }
        }

        // 3. Inspect core tokenholder legal rights
        (bool redExists, bool redRevoked, bool redStale) = _inspectAttestation(asset.metadata.redemptionRightAttestationId);
        (bool insExists, bool insRevoked, bool insStale) = _inspectAttestation(asset.metadata.insolvencyProtection);
        (bool ownExists, bool ownRevoked, bool ownStale) = _inspectAttestation(asset.metadata.nativeOwnership);

        bool hasRevokedMandatoryAttestation = redRevoked || insRevoked || ownRevoked;
        bool hasStaleAttestation = redStale || insStale || ownStale;

        bool hasRedemption = redExists && !redRevoked;
        bool hasInsolvency = insExists && !insRevoked;
        bool hasOwnership = ownExists && !ownRevoked;

        // 4. Evaluate custody reserve attestations and check for STALE timestamps
        uint256 totalVerifiedBacking = 0;
        bool hasValidBackingAttestation = false;

        bytes32[] memory attestationIds = asset.metadata.attestationIds;
        for (uint256 i = 0; i < attestationIds.length; i++) {
            bytes32 attId = attestationIds[i];
            if (attId == bytes32(0)) continue;

            TAFTypes.Attestation memory att = attestationRegistry.getAttestation(attId);
            if (att.id == bytes32(0)) continue;

            if (att.revoked) {
                hasRevokedMandatoryAttestation = true;
                continue;
            }

            // Check dynamic expiration window
            if (att.validUntil != 0 && block.timestamp > att.validUntil) {
                hasStaleAttestation = true;
            }

            // Decode quantity from resultData if available
            uint256 attestedAmount = 0;
            if (att.resultData.length >= 32) {
                attestedAmount = abi.decode(att.resultData, (uint256));
            } else {
                // If boolean claim without numeric payload, treat as full coverage
                attestedAmount = tokenSupply;
            }

            totalVerifiedBacking += attestedAmount;
            hasValidBackingAttestation = true;
        }

        // Calculate required reserves based on representationRatio
        // Default ratio of 1 = 1:1. Ratio of 10 = 10:1 (10 units of collateral per token)
        uint256 ratio = asset.metadata.representationRatio == 0 ? 1 : asset.metadata.representationRatio;
        uint256 requiredBacking = tokenSupply * ratio;

        // 5. Determine State based on TAF Policy
        TAFTypes.VerificationState resolvedState;

        if (hasRevokedMandatoryAttestation) {
            resolvedState = TAFTypes.VerificationState.REVOKED;
        } else if (!hasValidBackingAttestation || totalVerifiedBacking < requiredBacking || !redExists) {
            // Fails policy requirements (missing custody, underbacked, or missing mandatory rights)
            resolvedState = TAFTypes.VerificationState.UNVERIFIED;
        } else if (hasStaleAttestation) {
            // Meets all criteria, but validity period has elapsed -> Dynamically STALE!
            resolvedState = TAFTypes.VerificationState.STALE;
        } else {
            // Fully satisfies verification policy
            resolvedState = TAFTypes.VerificationState.VERIFIED;
        }

        return _buildReport(
            asset,
            tokenSupply,
            totalVerifiedBacking,
            resolvedState,
            hasRedemption,
            hasInsolvency,
            hasOwnership
        );
    }

    function _inspectAttestation(bytes32 attId) internal view returns (bool exists, bool isRevoked, bool isStale) {
        if (attId == bytes32(0)) return (false, false, false);
        TAFTypes.Attestation memory att = attestationRegistry.getAttestation(attId);
        if (att.id == bytes32(0)) return (false, false, false);
        exists = true;
        isRevoked = att.revoked;
        isStale = (att.validUntil != 0 && block.timestamp > att.validUntil);
    }

    function _buildReport(
        TAFTypes.ASSET memory asset,
        uint256 tokenSupply,
        uint256 verifiedBacking,
        TAFTypes.VerificationState state,
        bool hasRedemption,
        bool hasInsolvency,
        bool hasOwnership
    ) internal view returns (VerificationReport memory) {
        uint256 ratio = asset.metadata.representationRatio == 0 ? 1 : asset.metadata.representationRatio;
        return VerificationReport({
            assetId: asset.id.assetId,
            tokenContract: asset.id.tokenContract,
            issuer: asset.id.issuer,
            tokenSupply: tokenSupply,
            verifiedBacking: verifiedBacking,
            representationRatio: ratio,
            state: state,
            hasRedemptionRight: hasRedemption,
            hasInsolvencyProtection: hasInsolvency,
            hasNativeOwnership: hasOwnership,
            lastEvaluatedAt: block.timestamp
        });
    }
}
