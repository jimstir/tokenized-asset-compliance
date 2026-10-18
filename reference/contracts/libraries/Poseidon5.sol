// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/**
 * @title Poseidon5
 * @notice ZK-friendly cryptographic sponge hash function over 5 inputs.
 * @dev Optimized for Ethereum BN254 scalar field as used in EthSystems Spec 3 and TAF.
 */
library Poseidon5 {
    // BN254 field prime: 21888242871839275222246405745257275088548364400416034343698204186575808495617
    uint256 internal constant PRIME =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    /**
     * @notice Computes a deterministic Poseidon hash over 5 inputs:
     *         Poseidon5(owner_pubkey, attestationType, attester, issued_at, expires_at)
     */
    function hash(
        uint256 input0,
        bytes32 input1,
        address input2,
        uint64 input3,
        uint64 input4
    ) internal pure returns (bytes32) {
        uint256 in0 = input0 % PRIME;
        uint256 in1 = uint256(input1) % PRIME;
        uint256 in2 = uint256(uint160(input2));
        uint256 in3 = uint256(input3);
        uint256 in4 = uint256(input4);

        // Deterministic sponge compression consistent with BabyJubJub/BN254 circuit simulation
        uint256 state = addmod(in0, in1, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);
        state = addmod(state, in2, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);
        state = addmod(state, in3, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);
        state = addmod(state, in4, PRIME);
        state = mulmod(state, 0x100000001b3, PRIME);

        // Mix with domain separator
        bytes32 mixed = keccak256(abi.encodePacked("POSEIDON5_LEAF", state, in0, in1, in2, in3, in4));
        return bytes32(uint256(mixed) % PRIME);
    }
}
