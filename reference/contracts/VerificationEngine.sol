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

    address public owner;
    // Optional override for profile-level revocations
    mapping(bytes32 => bool) public explicitlyRevokedProfiles;

    error AssetNotFound(bytes32 assetId);
    error Unauthorized();

    constructor(address profileRegistryAddress, address attestationRegistryAddress) {
        owner = msg.sender;
        profileRegistry = IProfileRegistry(profileRegistryAddress);
        attestationRegistry = IAttestationRegistry(attestationRegistryAddress);
    }

    function setExplicitProfileRevocation(bytes32 assetId, bool isRevoked) external {
        TAFTypes.ASSET memory asset = profileRegistry.getAsset(assetId);
        if (msg.sender != owner && msg.sender != asset.id.issuer) {
            revert Unauthorized();
        }
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
        if (explicitlyRevokedProfiles[assetId] || !asset.status) {
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
        LegalRightsStatus memory legal = _evaluateLegalRights(asset);

        // 4. Evaluate custody reserve attestations and check for STALE timestamps
        BackingStatus memory backing = _evaluateCustodyBacking(asset.id.assetId, asset.metadata.attestationIds, tokenSupply);

        bool hasRevoked = legal.hasRevokedMandatory || backing.hasRevoked;
        bool hasStale = legal.hasStale || backing.hasStale;

        // Evaluate contextual requirements from operator entity's attestationReq if configured
        bool satisfiesReq = _checkAttestationRequirements(asset);

        // Calculate required reserves based on representationRatio
        uint256 ratio = asset.metadata.representationRatio == 0 ? 1 : asset.metadata.representationRatio;
        uint256 requiredBacking = tokenSupply * ratio;

        // 5. Determine State based on TAF Policy (Two-Tier State Resolution)
        TAFTypes.VerificationState resolvedState;

        if (hasRevoked || !backing.hasValidBackingAttestation || backing.totalVerifiedBacking < requiredBacking || !legal.redemptionExists || !satisfiesReq) {
            resolvedState = TAFTypes.VerificationState.UNVERIFIED;
        } else if (hasStale) {
            resolvedState = TAFTypes.VerificationState.STALE;
        } else {
            resolvedState = TAFTypes.VerificationState.VERIFIED;
        }

        return _buildReport(
            asset,
            tokenSupply,
            backing.totalVerifiedBacking,
            resolvedState,
            legal.hasRedemption,
            legal.hasInsolvency,
            legal.hasOwnership
        );
    }

    struct LegalRightsStatus {
        bool hasRedemption;
        bool hasInsolvency;
        bool hasOwnership;
        bool hasRevokedMandatory;
        bool hasStale;
        bool redemptionExists;
    }

    struct BackingStatus {
        uint256 totalVerifiedBacking;
        bool hasValidBackingAttestation;
        bool hasRevoked;
        bool hasStale;
    }

    function _evaluateLegalRights(TAFTypes.ASSET memory asset) internal view returns (LegalRightsStatus memory legal) {
        bytes32 assetId = asset.id.assetId;
        bytes32 redType = keccak256("REDEMPTION_RIGHT");
        bytes32 insType = keccak256("INSOLVENCY_PROTECTION");
        bytes32 ownType = keccak256("NATIVE_OWNERSHIP");

        (bool redExists, bool redRevoked, bool redStale) = _inspectAttestation(asset.metadata.redemptionRightAttestationId, assetId, redType);
        (bool insExists, bool insRevoked, bool insStale) = _inspectAttestation(asset.metadata.insolvencyProtection, assetId, insType);
        (bool ownExists, bool ownRevoked, bool ownStale) = _inspectAttestation(asset.metadata.nativeOwnership, assetId, ownType);

        legal.redemptionExists = redExists;
        legal.hasRedemption = redExists && !redRevoked;
        legal.hasInsolvency = insExists && !insRevoked;
        legal.hasOwnership = ownExists && !ownRevoked;
        legal.hasRevokedMandatory = redRevoked || insRevoked || ownRevoked;
        legal.hasStale = redStale || insStale || ownStale;
    }

    function _evaluateCustodyBacking(
        bytes32 assetId,
        bytes32[] memory attestationIds,
        uint256 tokenSupply
    ) internal view returns (BackingStatus memory backing) {
        bytes32 custodyType = keccak256("CUSTODY_RESERVES");
        for (uint256 i = 0; i < attestationIds.length; i++) {
            bytes32 attId = attestationIds[i];
            if (attId == bytes32(0)) continue;

            TAFTypes.Attestation memory att = attestationRegistry.getAttestation(attId);
            if (att.id == bytes32(0) || att.subjectIdentifier != assetId) continue;

            if (att.revoked) {
                backing.hasRevoked = true;
                continue;
            }

            if (att.validUntil != 0 && block.timestamp > att.validUntil) {
                backing.hasStale = true;
            }

            if (att.attestationType == custodyType) {
                uint256 attestedAmount = 0;
                if (att.resultData.length >= 32) {
                    attestedAmount = abi.decode(att.resultData, (uint256));
                } else {
                    attestedAmount = tokenSupply;
                }
                backing.totalVerifiedBacking += attestedAmount;
                backing.hasValidBackingAttestation = true;
            }
        }
    }

    function _checkAttestationRequirements(TAFTypes.ASSET memory asset) internal view returns (bool) {
        bytes32[] memory reqTypes = profileRegistry.getAttestationRequirements(asset.id.issuer, keccak256("ASSET"));
        if (reqTypes.length == 0) return true;

        bytes32[] memory attestationIds = asset.metadata.attestationIds;
        bytes32 assetId = asset.id.assetId;

        for (uint256 j = 0; j < reqTypes.length; j++) {
            bytes32 reqType = reqTypes[j];
            bool foundType = false;
            for (uint256 i = 0; i < attestationIds.length; i++) {
                bytes32 attId = attestationIds[i];
                if (attId == bytes32(0)) continue;
                TAFTypes.Attestation memory att = attestationRegistry.getAttestation(attId);
                if (att.id != bytes32(0) && att.subjectIdentifier == assetId && att.attestationType == reqType && !att.revoked) {
                    foundType = true;
                    break;
                }
            }
            if (!foundType) return false;
        }
        return true;
    }

    function _inspectAttestation(
        bytes32 attId,
        bytes32 expectedSubject,
        bytes32 expectedType
    ) internal view returns (bool exists, bool isRevoked, bool isStale) {
        if (attId == bytes32(0)) return (false, false, false);
        TAFTypes.Attestation memory att = attestationRegistry.getAttestation(attId);
        if (att.id == bytes32(0)) return (false, false, false);
        if (att.subjectIdentifier != expectedSubject || att.attestationType != expectedType) {
            return (false, false, false);
        }
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
