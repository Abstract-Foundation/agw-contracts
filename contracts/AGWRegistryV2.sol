// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {Errors} from "./libraries/Errors.sol";
import {IAGWRegistry} from "./interfaces/IAGWRegistry.sol";
import {IAGWRegistryV2} from "./interfaces/IAGWRegistryV2.sol";

contract AGWRegistryV2 is Ownable2Step, IAGWRegistryV2 {
    uint8 public constant VERSION_NONE = 0;
    uint8 public constant VERSION_V1 = 1;

    address public immutable v1Registry;

    mapping(address => bool) public isFactory;

    mapping(address => uint8 version) private _agwVersion;

    event AGWRegistered(address indexed account, uint8 indexed version);
    event AGWUnregistered(
        address indexed account,
        uint8 indexed previousVersion
    );

    /**
     * @notice Event emitted when a factory contract is set
     * @param factory address - Address of the factory contract
     */
    event FactorySet(address indexed factory);

    /**
     * @notice Event emitted when a factory contract is unset
     * @param factory address - Address of the factory contract
     */
    event FactoryUnset(address indexed factory);

    error INVALID_VERSION();

    constructor(address _owner, address _v1Registry) Ownable(_owner) {
        v1Registry = _v1Registry;
    }

    /**
     * @notice Registers an account as an AGW account
     * @dev Can only be called by the factory or owner
     * @param account address - Address of the account to register
     */
    function register(
        address account,
        uint8 version
    ) external override onlyFactoryOrOwner {
        _register(account, version);
    }

    /**
     * @notice Registers multiple accounts as AGW accounts
     * @dev Can only be called by the factory or owner
     * @param accounts address[] - Array of addresses to register
     * @param version uint8 - AGW version to assign to each account
     */
    function registerMultiple(
        address[] calldata accounts,
        uint8 version
    ) external onlyFactoryOrOwner {
        if (version == VERSION_NONE) revert INVALID_VERSION();

        for (uint256 i = 0; i < accounts.length; i++) {
            _setVersion(accounts[i], version);
        }
    }

    /**
     * @notice Unregisters an account from this registry
     * @dev Cannot unregister accounts that are only present in the v1 fallback registry
     * @param account address - Address of the account to unregister
     */
    function unregister(address account) external onlyFactoryOrOwner {
        _unsetVersion(account);
    }

    /**
     * @notice Unregisters multiple accounts from this registry
     * @dev Cannot unregister accounts that are only present in the v1 fallback registry
     * @param accounts address[] - Array of addresses to unregister
     */
    function unregisterMultiple(
        address[] calldata accounts
    ) external onlyFactoryOrOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _unsetVersion(accounts[i]);
        }
    }

    /**
     * @notice Returns whether an account is registered as any AGW version
     */
    function isAGW(address account) external view override returns (bool) {
        return versionOf(account) != VERSION_NONE;
    }

    /**
     * @notice Returns whether an account is registered as a specific AGW version
     */
    function isAGWVersion(
        address account,
        uint8 version
    ) external view override returns (bool) {
        return versionOf(account) == version;
    }

    /**
     * @notice Returns the AGW version for an account
     * @dev Local v2 registry state takes precedence over the v1 fallback registry.
     */
    function versionOf(address account) public view override returns (uint8) {
        uint8 localVersion = _agwVersion[account];
        if (localVersion != VERSION_NONE) {
            return localVersion;
        }

        if (
            v1Registry != address(0) && IAGWRegistry(v1Registry).isAGW(account)
        ) {
            return VERSION_V1;
        }

        return VERSION_NONE;
    }

    /**
     * @notice Sets a new factory contract
     * @dev Can only be called by the owner
     * @param factory_ address - Address of the new factory
     */
    function setFactory(address factory_) external onlyOwner {
        isFactory[factory_] = true;

        emit FactorySet(factory_);
    }

    /**
     * @notice Unsets a factory contract
     * @dev Can only be called by the owner
     * @param factory_ address - Address of the factory
     */
    function unsetFactory(address factory_) external onlyOwner {
        isFactory[factory_] = false;

        emit FactoryUnset(factory_);
    }

    function _register(address account, uint8 version) internal {
        if (version == VERSION_NONE) revert INVALID_VERSION();

        _setVersion(account, version);
    }

    function _setVersion(address account, uint8 version) internal {
        _agwVersion[account] = version;

        emit AGWRegistered(account, version);
    }

    function _unsetVersion(address account) internal {
        uint8 previousVersion = _agwVersion[account];
        delete _agwVersion[account];

        emit AGWUnregistered(account, previousVersion);
    }

    modifier onlyFactoryOrOwner() {
        if (!isFactory[msg.sender] && msg.sender != owner()) {
            revert Errors.NOT_FROM_FACTORY();
        }

        _;
    }
}
