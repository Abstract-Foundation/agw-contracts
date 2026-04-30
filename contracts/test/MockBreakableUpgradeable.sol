// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BreakableUpgradeable} from "../proxy/BreakableUpgradeable.sol";

contract MockBreakableUpgradeable is BreakableUpgradeable {
    error AlreadyInitialized();
    error NotOwner();

    uint256 public value;
    address public owner;

    uint256 private immutable _version;

    constructor(uint256 version_) {
        _version = version_;
    }

    function initialize(address owner_, uint256 value_) external {
        if (owner != address(0)) {
            revert AlreadyInitialized();
        }

        owner = owner_;
        value = value_;
    }

    function version() external view returns (uint256) {
        return _version;
    }

    function setValue(uint256 value_) external {
        value = value_;
    }

    function _authorizeUpgrade(address) internal view override {
        if (msg.sender != owner) {
            revert NotOwner();
        }
    }
}
