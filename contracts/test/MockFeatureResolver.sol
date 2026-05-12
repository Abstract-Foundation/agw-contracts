// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {IFeatureResolver} from "../interfaces/IFeatureResolver.sol";

contract MockFeatureResolver is IFeatureResolver {
    mapping(address agw => mapping(uint8 featureId => bool supported))
        public supported;

    bool public shouldRevert;

    function setSupported(
        address agw,
        uint8 featureId,
        bool isSupported
    ) external {
        supported[agw][featureId] = isSupported;
    }

    function setShouldRevert(bool shouldRevert_) external {
        shouldRevert = shouldRevert_;
    }

    function supportsFeature(
        address agw,
        uint8 featureId,
        bytes calldata
    ) external view returns (bool) {
        if (shouldRevert) revert();

        return supported[agw][featureId];
    }
}
