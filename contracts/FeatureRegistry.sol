// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {IFeatureRegistry} from "./interfaces/IFeatureRegistry.sol";
import {IFeatureResolver} from "./interfaces/IFeatureResolver.sol";

contract FeatureRegistry is Ownable2Step, IFeatureRegistry {
    mapping(uint8 id => Feature feature) private _features;
    mapping(uint8 id => bool defined) private _isFeatureDefined;
    mapping(bytes32 key => uint8 id) private _featureIdByKey;
    mapping(bytes32 key => bool exists) private _featureKeyExists;
    mapping(uint8 id => uint256 indexPlusOne) private _featureIndexPlusOne;

    uint8[] private _featureIds;

    error EMPTY_FEATURE_KEY();
    error EMPTY_RESOLVER();
    error FEATURE_NOT_DEFINED();
    error FEATURE_KEY_ALREADY_USED();

    constructor(address _owner) Ownable(_owner) {}

    function setFeature(
        uint8 id,
        bytes32 key,
        string calldata name,
        string calldata metadataURI,
        address resolver,
        bytes calldata resolverData,
        bool enabled
    ) external onlyOwner {
        if (key == bytes32(0)) revert EMPTY_FEATURE_KEY();
        if (resolver == address(0)) revert EMPTY_RESOLVER();

        bytes32 previousKey = _features[id].key;
        if (
            _featureKeyExists[key] &&
            (!_isFeatureDefined[id] || previousKey != key)
        ) {
            revert FEATURE_KEY_ALREADY_USED();
        }

        if (!_isFeatureDefined[id]) {
            _featureIds.push(id);
            _featureIndexPlusOne[id] = _featureIds.length;
            _isFeatureDefined[id] = true;
        } else if (previousKey != key) {
            delete _featureIdByKey[previousKey];
            delete _featureKeyExists[previousKey];
        }

        uint256 mask = _maskFor(id);
        _features[id] = Feature({
            id: id,
            mask: mask,
            key: key,
            name: name,
            metadataURI: metadataURI,
            resolver: resolver,
            resolverData: resolverData,
            enabled: enabled
        });
        _featureIdByKey[key] = id;
        _featureKeyExists[key] = true;

        emit FeatureSet(
            id,
            mask,
            key,
            name,
            metadataURI,
            resolver,
            resolverData,
            enabled
        );
    }

    function unsetFeature(uint8 id) external onlyOwner {
        if (!_isFeatureDefined[id]) revert FEATURE_NOT_DEFINED();

        Feature memory feature = _features[id];
        uint256 index = _featureIndexPlusOne[id] - 1;
        uint256 lastIndex = _featureIds.length - 1;

        if (index != lastIndex) {
            uint8 lastId = _featureIds[lastIndex];
            _featureIds[index] = lastId;
            _featureIndexPlusOne[lastId] = index + 1;
        }

        _featureIds.pop();
        delete _featureIndexPlusOne[id];
        delete _isFeatureDefined[id];
        delete _featureIdByKey[feature.key];
        delete _featureKeyExists[feature.key];
        delete _features[id];

        emit FeatureUnset(id, feature.mask, feature.key);
    }

    function getFeature(uint8 id) external view returns (Feature memory) {
        if (!_isFeatureDefined[id]) revert FEATURE_NOT_DEFINED();

        return _features[id];
    }

    function getFeatures(
        uint8[] calldata ids
    ) external view returns (Feature[] memory features) {
        features = new Feature[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            if (!_isFeatureDefined[ids[i]]) revert FEATURE_NOT_DEFINED();

            features[i] = _features[ids[i]];
        }
    }

    function getFeatureCount() external view returns (uint256) {
        return _featureIds.length;
    }

    function getFeatureIdAt(uint256 index) external view returns (uint8) {
        return _featureIds[index];
    }

    function getFeatureIds() external view returns (uint8[] memory) {
        return _featureIds;
    }

    function getFeatureMask(uint8 id) external pure returns (uint256) {
        return _maskFor(id);
    }

    function featureIdOf(
        bytes32 key
    ) external view returns (uint8 id, bool exists) {
        return (_featureIdByKey[key], _featureKeyExists[key]);
    }

    function isFeatureDefined(uint8 id) external view returns (bool) {
        return _isFeatureDefined[id];
    }

    function supportsFeature(address agw, uint8 id) public view returns (bool) {
        if (!_isFeatureDefined[id]) return false;

        Feature storage feature = _features[id];
        if (!feature.enabled) return false;

        try
            IFeatureResolver(feature.resolver).supportsFeature(
                agw,
                id,
                feature.resolverData
            )
        returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

    function supportsAllFeatures(
        address agw,
        uint256 features
    ) external view returns (bool) {
        if (features == 0) return true;

        for (uint8 id = 0; id < 255; id++) {
            uint256 mask = _maskFor(id);
            if (features & mask != 0 && !supportsFeature(agw, id)) {
                return false;
            }
        }

        return features & _maskFor(255) == 0 || supportsFeature(agw, 255);
    }

    function supportsAnyFeature(
        address agw,
        uint256 features
    ) external view returns (bool) {
        if (features == 0) return false;

        for (uint8 id = 0; id < 255; id++) {
            uint256 mask = _maskFor(id);
            if (features & mask != 0 && supportsFeature(agw, id)) {
                return true;
            }
        }

        return features & _maskFor(255) != 0 && supportsFeature(agw, 255);
    }

    function getSupportedFeatures(address agw) external view returns (uint256) {
        uint256 supportedFeatures;

        for (uint256 i = 0; i < _featureIds.length; i++) {
            uint8 id = _featureIds[i];
            if (supportsFeature(agw, id)) {
                supportedFeatures |= _maskFor(id);
            }
        }

        return supportedFeatures;
    }

    function _maskFor(uint8 id) internal pure returns (uint256) {
        return uint256(1) << id;
    }
}
