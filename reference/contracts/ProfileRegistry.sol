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
    // Mapping from user address => Participant Profile (transparent)
    mapping(address => TAFTypes.PARTICIPANT) private _participants;
    // Mapping from shieldedKeyHash (owner_pubkey) => Participant Profile (shielded)
    mapping(bytes32 => TAFTypes.PARTICIPANT) private _shieldedParticipants;

    // operatorAddress => targetProfileType => required attestationType hashes
    mapping(address => mapping(bytes32 => bytes32[])) public attestationReq;

    error EntityAlreadyRegistered(address owner);
    error EntityNotRegistered(address owner);
    error EntityInactive(address owner);
    error NotOperatorEntity(address owner);
    error AssetAlreadyRegistered(bytes32 assetId);
    error InvalidIssuer(address issuer);
    error ParticipantAlreadyRegistered(address user);

    /**
     * @notice Registers an ENTITY profile (default operator = false)
     */
    function registerEntity(
        bytes32 did,
        TAFTypes.VisibilityPreference visibility,
        bytes32 legalDocumentHash
    ) external override {
        _registerEntity(false, did, visibility, legalDocumentHash);
    }

    /**
     * @notice Registers an ENTITY profile with operator privileges
     */
    function registerOperatorEntity(
        bytes32 did,
        TAFTypes.VisibilityPreference visibility,
        bytes32 legalDocumentHash
    ) external override {
        _registerEntity(true, did, visibility, legalDocumentHash);
    }

    function _registerEntity(
        bool operator,
        bytes32 did,
        TAFTypes.VisibilityPreference visibility,
        bytes32 legalDocumentHash
    ) internal {
        if (_entities[msg.sender].owner != address(0)) {
            revert EntityAlreadyRegistered(msg.sender);
        }

        bytes32[] memory emptyAttestations = new bytes32[](0);
        TAFTypes.ENTITY memory entity = TAFTypes.ENTITY({
            owner: msg.sender,
            operator: operator,
            did: did,
            visibility: visibility,
            legalDocumentHash: legalDocumentHash,
            attestationIds: emptyAttestations,
            status: true
        });

        _entities[msg.sender] = entity;
        emit EntityRegistered(msg.sender, did, visibility);
    }

    /**
     * @notice Sets mandatory attestation requirements for a profile type in this operator's offering
     */
    function setAttestationRequirement(
        bytes32 targetProfileType,
        bytes32[] calldata requiredTypes
    ) external override {
        if (!_entities[msg.sender].status || !_entities[msg.sender].operator) {
            revert NotOperatorEntity(msg.sender);
        }
        attestationReq[msg.sender][targetProfileType] = requiredTypes;
        emit AttestationRequirementSet(msg.sender, targetProfileType, requiredTypes);
    }

    function getAttestationRequirements(
        address operator,
        bytes32 targetProfileType
    ) external view override returns (bytes32[] memory) {
        return attestationReq[operator][targetProfileType];
    }

    /**
     * @notice Registers an ASSET profile linking an AssetId and AssetMetadata
     */
    function registerAsset(
        TAFTypes.AssetId calldata id,
        TAFTypes.AssetMetadata calldata metadata
    ) external override {
        require(id.assetId != bytes32(0), "Invalid assetId");
        if (_assets[id.assetId].id.assetId != bytes32(0)) {
            revert AssetAlreadyRegistered(id.assetId);
        }

        // Issuer MUST be an active registered Entity
        if (!_entities[id.issuer].status) {
            revert InvalidIssuer(id.issuer);
        }

        // Only the designated issuer can register the asset profile
        if (msg.sender != id.issuer) {
            revert InvalidIssuer(msg.sender);
        }

        TAFTypes.ASSET memory asset = TAFTypes.ASSET({
            id: id,
            metadata: metadata,
            status: true
        });

        _assets[id.assetId] = asset;
        emit AssetRegistered(id.assetId, id.tokenContract, id.issuer);
    }

    /**
     * @notice Registers a PARTICIPANT profile
     *         For shielded participants, user address is set to address(0) to prevent linking
     */
    function registerParticipant(
        uint256 participantType,
        bytes32 shieldedKeyHash,
        TAFTypes.VisibilityPreference visibility,
        bytes32 jurisdiction
    ) external override {
        bytes32[] memory emptyAttestations = new bytes32[](0);

        if (visibility == TAFTypes.VisibilityPreference.SHIELDED) {
            require(shieldedKeyHash != bytes32(0), "Invalid key hash");
            if (_shieldedParticipants[shieldedKeyHash].shieldedKeyHash != bytes32(0)) {
                revert ParticipantAlreadyRegistered(address(0));
            }

            TAFTypes.PARTICIPANT memory participant = TAFTypes.PARTICIPANT({
                user: address(0),
                participantType: participantType,
                shieldedKeyHash: shieldedKeyHash,
                visibility: visibility,
                jurisdiction: jurisdiction,
                identityAttestationIds: emptyAttestations
            });

            _shieldedParticipants[shieldedKeyHash] = participant;
            emit ParticipantRegistered(address(0), shieldedKeyHash, visibility);
        } else {
            if (_participants[msg.sender].user != address(0)) {
                revert ParticipantAlreadyRegistered(msg.sender);
            }

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
    }

    function isRegisteredEntity(address entityAddress) external view override returns (bool) {
        return _entities[entityAddress].status;
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

    function getParticipantByShieldedKey(bytes32 shieldedKeyHash) external view override returns (TAFTypes.PARTICIPANT memory) {
        return _shieldedParticipants[shieldedKeyHash];
    }
}
