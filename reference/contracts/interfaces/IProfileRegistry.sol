// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "../libraries/TAFTypes.sol";

/**
 * @title IProfileRegistry
 * @notice Standard interface for managing Entity, Asset, and Participant profiles.
 */
interface IProfileRegistry {
    event EntityRegistered(address indexed owner, bytes32 indexed did, TAFTypes.VisibilityPreference visibility);
    event AssetRegistered(bytes32 indexed assetId, address indexed tokenContract, address indexed issuer);
    event ParticipantRegistered(address indexed user, bytes32 indexed shieldedKeyHash, TAFTypes.VisibilityPreference visibility);
    event AttestationRequirementSet(address indexed operator, bytes32 indexed targetProfileType, bytes32[] requiredTypes);

    function registerEntity(
        bytes32 did,
        TAFTypes.VisibilityPreference visibility,
        bytes32 legalDocumentHash
    ) external;

    function registerOperatorEntity(
        bytes32 did,
        TAFTypes.VisibilityPreference visibility,
        bytes32 legalDocumentHash
    ) external;

    function setAttestationRequirement(
        bytes32 targetProfileType,
        bytes32[] calldata requiredTypes
    ) external;

    function getAttestationRequirements(
        address operator,
        bytes32 targetProfileType
    ) external view returns (bytes32[] memory);

    function registerAsset(
        TAFTypes.AssetId calldata id,
        TAFTypes.AssetMetadata calldata metadata
    ) external;

    function registerParticipant(
        uint256 participantType,
        bytes32 shieldedKeyHash,
        TAFTypes.VisibilityPreference visibility,
        bytes32 jurisdiction
    ) external;

    function isRegisteredEntity(address entityAddress) external view returns (bool);
    function getEntity(address entityAddress) external view returns (TAFTypes.ENTITY memory);
    function getAsset(bytes32 assetId) external view returns (TAFTypes.ASSET memory);
    function getParticipant(address user) external view returns (TAFTypes.PARTICIPANT memory);
    function getParticipantByShieldedKey(bytes32 shieldedKeyHash) external view returns (TAFTypes.PARTICIPANT memory);
}
