// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "./libraries/TAFTypes.sol";
import {IProfileRegistry} from "./interfaces/IProfileRegistry.sol";

/**
 * @title ProfileRegistry
 * @notice Central registry for ENTITY, ASSET, and PARTICIPANT profiles in TAF.
 */
contract ProfileRegistry is IProfileRegistry {
    // Mapping from owner address => Entity Profile
    mapping(address => TAFTypes.ENTITY) private _entities;
    // Mapping from assetId => Asset Profile
    mapping(bytes32 => TAFTypes.ASSET) private _assets;
    // Mapping from user address => Participant Profile
    mapping(address => TAFTypes.PARTICIPANT) private _participants;

    error EntityAlreadyRegistered(address owner);
    error EntityNotRegistered(address owner);
    error EntityInactive(address owner);
    error AssetAlreadyRegistered(bytes32 assetId);
    error InvalidIssuer(address issuer);
    error ParticipantAlreadyRegistered(address user);

    /**
     * @notice Registers an ENTITY profile (e.g., Custodian, Auditor, Issuer)
     */
    function registerEntity(
        bytes32 did,
        TAFTypes.VisibilityPreference visibility,
        bytes32 legalDocumentHash
    ) external override {
        if (_entities[msg.sender].owner != address(0)) {
            revert EntityAlreadyRegistered(msg.sender);
        }

        TAFTypes.ENTITY memory entity = TAFTypes.ENTITY({
            owner: msg.sender,
            did: did,
            visibility: visibility,
            legalDocumentHash: legalDocumentHash,
            isActive: true
        });

        _entities[msg.sender] = entity;
        emit EntityRegistered(msg.sender, did, visibility);
    }

    /**
     * @notice Registers an ASSET profile linking an AssetId and AssetMetadata
     */
    function registerAsset(
        TAFTypes.AssetId calldata id,
        TAFTypes.AssetMetadata calldata metadata
    ) external override {
        if (_assets[id.assetId].id.assetId != bytes32(0)) {
            revert AssetAlreadyRegistered(id.assetId);
        }

        // Issuer MUST be an active registered Entity
        if (!_entities[id.issuer].isActive) {
            revert InvalidIssuer(id.issuer);
        }

        TAFTypes.ASSET memory asset = TAFTypes.ASSET({
            id: id,
            metadata: metadata,
            isActive: true
        });

        _assets[id.assetId] = asset;
        emit AssetRegistered(id.assetId, id.tokenContract, id.issuer);
    }

    /**
     * @notice Registers a PARTICIPANT profile
     */
    function registerParticipant(
        uint256 participantType,
        bytes32 shieldedKeyHash,
        TAFTypes.VisibilityPreference visibility,
        bytes32 jurisdiction
    ) external override {
        if (_participants[msg.sender].user != address(0)) {
            revert ParticipantAlreadyRegistered(msg.sender);
        }

        bytes32[] memory emptyAttestations = new bytes32[](0);
        TAFTypes.PARTICIPANT memory participant = TAFTypes.PARTICIPANT({
            user: msg.sender,
            participantType: participantType,
            shieldedKeyHash: shieldedKeyHash,
            visibility: visibility,
            jurisdiction: jurisdiction,
            identityAttestationIds: emptyAttestations
        });

        _participants[msg.sender] = participant;
        emit ParticipantRegistered(msg.sender, shieldedKeyHash, visibility);
    }

    function isRegisteredEntity(address entityAddress) external view override returns (bool) {
        return _entities[entityAddress].isActive;
    }

    function getEntity(address entityAddress) external view override returns (TAFTypes.ENTITY memory) {
        return _entities[entityAddress];
    }

    function getAsset(bytes32 assetId) external view override returns (TAFTypes.ASSET memory) {
        return _assets[assetId];
    }

    function getParticipant(address user) external view override returns (TAFTypes.PARTICIPANT memory) {
        return _participants[user];
    }
}
