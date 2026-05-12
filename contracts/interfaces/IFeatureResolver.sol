// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

interface IFeatureResolver {
    function supportsFeature(
        address agw,
        uint8 featureId,
        bytes calldata resolverData
    ) external view returns (bool);
}
