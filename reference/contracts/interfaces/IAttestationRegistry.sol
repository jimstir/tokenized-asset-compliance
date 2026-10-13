// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "../libraries/TAFTypes.sol";

/**
 * @title IAttestationRegistry
 * @notice Standard interface for managing attestations, tagging maps, and revocations.
 */
interface IAttestationRegistry {
    event AttestationSubmitted(bytes32 indexed id, address indexed attestor, bytes32 indexed subjectIdentifier, bytes32 attestationType);
    event AttestationRevoked(bytes32 indexed id, address indexed attestor);

    function submitAttestation(TAFTypes.Attestation calldata attestation) external returns (bytes32 id);
    function submitShieldedAttestation(
        uint256 ownerPubkey,
        bytes32 attestationType,
        uint64 validUntil,
        bytes calldata proofOfAudit
    ) external returns (bytes32 leaf);

    function revokeAttestation(bytes32 attestationId) external;
    function getAttestation(bytes32 attestationId) external view returns (TAFTypes.Attestation memory);
    function getTaggedAttestationId(bytes32 subjectIdentifier, bytes32 attestationType, address attestor) external view returns (bytes32);
    function isAttestationValid(bytes32 attestationId) external view returns (bool);
}
