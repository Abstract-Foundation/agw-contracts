// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

interface IFeatureRegistry {
    struct Feature {
        uint8 id;
        uint256 mask;
        bytes32 key;
        string name;
        string metadataURI;
        address resolver;
        bytes resolverData;
        bool enabled;
    }

    event FeatureSet(
        uint8 indexed id,
        uint256 indexed mask,
        bytes32 indexed key,
        string name,
        string metadataURI,
        address resolver,
        bytes resolverData,
        bool enabled
    );
    event FeatureUnset(
        uint8 indexed id,
        uint256 indexed mask,
        bytes32 indexed key
    );

    function setFeature(
        uint8 id,
        bytes32 key,
        string calldata name,
        string calldata metadataURI,
        address resolver,
        bytes calldata resolverData,
        bool enabled
    ) external;

    function unsetFeature(uint8 id) external;

    function getFeature(uint8 id) external view returns (Feature memory);

    function getFeatures(
        uint8[] calldata ids
    ) external view returns (Feature[] memory);

    function getFeatureCount() external view returns (uint256);

    function getFeatureIdAt(uint256 index) external view returns (uint8);

    function getFeatureIds() external view returns (uint8[] memory);

    function getFeatureMask(uint8 id) external pure returns (uint256);

    function featureIdOf(
        bytes32 key
    ) external view returns (uint8 id, bool exists);

    function isFeatureDefined(uint8 id) external view returns (bool);

    function supportsFeature(
        address agw,
        uint8 id
    ) external view returns (bool);

    function supportsAllFeatures(
        address agw,
        uint256 features
    ) external view returns (bool);

    function supportsAnyFeature(
        address agw,
        uint256 features
    ) external view returns (bool);

    function getSupportedFeatures(address agw) external view returns (uint256);
}
