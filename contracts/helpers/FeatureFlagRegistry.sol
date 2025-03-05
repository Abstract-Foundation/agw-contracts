// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FeatureFlagRegistry
 * @notice A contract for managing feature flags onchain
 */
contract FeatureFlagRegistry is AccessControl {
    error Immutable();

    event FeatureFlagEnabled(bytes32 indexed featureFlagHash, address indexed user, bool status);
    event FeatureFlagImmutable(bytes32 indexed featureFlagHash);

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _featureFlagStatus;
    mapping(bytes32 => bool) public featureFlagImmutable;

    /**
     * @notice Initializes the contract with an owner who receives the DEFAULT_ADMIN_ROLE
     * @param owner Address that will be granted the admin role
     */
    constructor(address owner) {
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    /**
     * @notice Sets the status of a feature flag for a specific user; specify zero address to set the global status
     * @dev Only callable by accounts with MANAGER_ROLE
     * @param featureFlag String identifier of the feature flag
     * @param user Address of the user to set the status for
     * @param status Boolean indicating if the feature should be enabled
     * @custom:throws Immutable if the feature flag has been made immutable
     */
    function setFeatureFlagStatus(string memory featureFlag, address user, bool status) public onlyRole(MANAGER_ROLE) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (featureFlagImmutable[featureFlagHash]) {
            revert Immutable();
        }
        _featureFlagStatus[featureFlagHash][user] = status;

        emit FeatureFlagEnabled(featureFlagHash, user, status);
    }

    /**
     * @notice Makes a feature flag immutable, preventing future status changes
     * @dev Only callable by accounts with MANAGER_ROLE
     * @param featureFlag String identifier of the feature flag
     * @custom:throws Immutable if the feature flag is already immutable
     */
    function setFeatureFlagImmutable(string memory featureFlag) public onlyRole(MANAGER_ROLE) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);
        if (featureFlagImmutable[featureFlagHash]) {
            revert Immutable();
        }
        featureFlagImmutable[featureFlagHash] = true;
    }

    /**
     * @notice Checks if a feature flag is enabled for a specific user
     * @param featureFlag String identifier of the feature flag
     * @param user Address of the user to check
     * @return bool True if the feature is enabled for the user
     */
    function isFeatureFlagEnabled(string memory featureFlag, address user) public view returns (bool) {
        bytes32 featureFlagHash = _hashFeatureFlag(featureFlag);

        return isFeatureFlagEnabled(featureFlagHash, user);
    }

    /**
     * @notice Checks if a feature flag is enabled for a specific user using the feature flag hash
     * @dev Implements the logic for checking feature flag status, considering global and user-specific settings
     * @param featureFlagHash Hash of the feature flag identifier
     * @param user Address of the user to check
     * @return bool True if the feature is enabled for the user
     */
    function isFeatureFlagEnabled(bytes32 featureFlagHash, address user) public view returns (bool) {
        bool globalStatus = _featureFlagStatus[featureFlagHash][address(0)];

        if (user == address(0) || featureFlagImmutable[featureFlagHash]) {
            return globalStatus;
        } else if (globalStatus) {
            return true;
        }
        return _featureFlagStatus[featureFlagHash][user];
    }

    /**
     * @notice Hashes a feature flag string identifier
     * @dev Internal helper function to consistently hash feature flag strings
     * @param featureFlag String identifier to hash
     * @return bytes32 Keccak256 hash of the feature flag string
     */
    function _hashFeatureFlag(string memory featureFlag) internal pure returns (bytes32) {
        return keccak256(bytes(featureFlag));
    }
}
