// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract FeatureFlagRegistry is AccessControl {
    error CircuitBreakerTripped();

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => mapping(address => bool)) public _featureFlagForAddress;
    mapping(bytes32 => bool) public _featureFlagGlobalStatus;
    mapping(bytes32 => bool) public _featureFlagCircuitBreaker;

    constructor(address owner) {
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    function setFeatureFlagGlobalStatus(string memory featureFlag, bool status) public onlyRole(MANAGER_ROLE) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (_featureFlagCircuitBreaker[featureFlagHash]) {
            revert CircuitBreakerTripped();
        }
        _featureFlagGlobalStatus[featureFlagHash] = status;
    }

    function setFeatureFlagForAddress(string memory featureFlag, address user, bool status)
        public
        onlyRole(MANAGER_ROLE)
    {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (_featureFlagCircuitBreaker[featureFlagHash]) {
            revert CircuitBreakerTripped();
        }
        _featureFlagForAddress[featureFlagHash][user] = status;
    }

    function tripFeatureFlagCircuitBreaker(string memory featureFlag) public onlyRole(MANAGER_ROLE) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (_featureFlagCircuitBreaker[featureFlagHash]) {
            revert CircuitBreakerTripped();
        }
        _featureFlagCircuitBreaker[featureFlagHash] = true;
    }

    function isFeatureFlagEnabled(string memory featureFlag, address user) public view returns (bool) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);

        return isFeatureFlagEnabled(featureFlagHash, user);
    }

    function isFeatureFlagEnabled(bytes32 featureFlagHash, address user) public view returns (bool) {
        bool globalStatus = _featureFlagGlobalStatus[featureFlagHash];

        if (_featureFlagCircuitBreaker[featureFlagHash]) {
            return globalStatus;
        } else if (globalStatus) {
            return true;
        }
        return _featureFlagForAddress[featureFlagHash][user];
    }

    function _hashFeatureFlag(string memory featureFlag) internal pure returns (bytes32) {
        return keccak256(bytes(featureFlag));
    }
}
