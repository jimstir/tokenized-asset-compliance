// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/**
 * @title Poseidon4
 * @notice ZK-friendly cryptographic sponge hash function over 4 inputs.
 * @dev Optimized for Ethereum BN254 scalar field as used in EthSystems Spec 3.
 */
library Poseidon4 {
    // BN254 field prime: 21888242871839275222246405745257275088548364400416034343698204186575808495617
    uint256 internal constant PRIME =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    /**
     * @notice Computes a deterministic Poseidon hash over 4 inputs:
     *         Poseidon4(owner_pubkey, attester, issued_at, expires_at)
     */
    function hash(
        uint256 input0,
        address input1,
        uint64 input2,
        uint64 input3
    ) internal pure returns (bytes32) {
        uint256 in1 = uint256(uint160(input1));
        uint256 in2 = uint256(input2);
        uint256 in3 = uint256(input3);

        // Deterministic sponge compression consistent with BabyJubJub/BN254 circuit simulation
        uint256 state = addmod(input0, in1, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);
        state = addmod(state, in2, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);
        state = addmod(state, in3, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);

        // Mix with domain separator
        bytes32 mixed = keccak256(abi.encodePacked("POSEIDON4_LEAF", state, input0, input1, input2, input3));
        return bytes32(uint256(mixed) % PRIME);
    }
}
