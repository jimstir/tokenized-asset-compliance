// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "../libraries/TAFTypes.sol";

/**
 * @title IVerificationEngine
 * @notice Standard interface for evaluating verification policies and querying compliance state.
 */
interface IVerificationEngine {
    struct VerificationReport {
        bytes32 assetId;
        address tokenContract;
        address issuer;
        uint256 tokenSupply;
        uint256 verifiedBacking;
        uint256 representationRatio;
        TAFTypes.VerificationState state;
        bool hasRedemptionRight;
        bool hasInsolvencyProtection;
        bool hasNativeOwnership;
        uint256 lastEvaluatedAt;
    }

    event StateEvaluated(bytes32 indexed assetId, TAFTypes.VerificationState indexed state, uint256 tokenSupply, uint256 verifiedBacking);

    function evaluateVerificationState(bytes32 assetId) external view returns (TAFTypes.VerificationState);
    function getVerificationReport(bytes32 assetId) external view returns (VerificationReport memory);
}
