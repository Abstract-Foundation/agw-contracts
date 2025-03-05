// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract FeatureFlagRegistry is AccessControl {
    error Immutable();

    event FeatureFlagEnabled(bytes32 indexed featureFlagHash, address indexed user, bool status);
    event FeatureFlagImmutable(bytes32 indexed featureFlagHash);

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => mapping(address => bool)) public featureFlagStatus;
    mapping(bytes32 => bool) public featureFlagImmutable;

    constructor(address owner) {
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    function setFeatureFlagStatus(string memory featureFlag, address user, bool status)
        public
        onlyRole(MANAGER_ROLE)
    {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (featureFlagImmutable[featureFlagHash]) {
            revert Immutable();
        }
        featureFlagStatus[featureFlagHash][user] = status;

        emit FeatureFlagEnabled(featureFlagHash, user, status);
    }

    function setFeatureFlagImmutable(string memory featureFlag) public onlyRole(MANAGER_ROLE) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (featureFlagImmutable[featureFlagHash]) {
            revert Immutable();
        }
        featureFlagImmutable[featureFlagHash] = true;
    }

    function isFeatureFlagEnabled(string memory featureFlag, address user) public view returns (bool) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);

        return isFeatureFlagEnabled(featureFlagHash, user);
    }

    function isFeatureFlagEnabled(bytes32 featureFlagHash, address user) public view returns (bool) {
        bool globalStatus = featureFlagStatus[featureFlagHash][address(0)];

        if (user == address(0) || featureFlagImmutable[featureFlagHash]) {
            return globalStatus;
        } else if (globalStatus) {
            return true;
        }
        return featureFlagStatus[featureFlagHash][user];
    }

    function _hashFeatureFlag(string memory featureFlag) internal pure returns (bytes32) {
        return keccak256(bytes(featureFlag));
    }
}
