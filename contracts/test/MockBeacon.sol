// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

contract MockBeacon is IBeacon {
    error InvalidImplementation(address implementation);

    event Upgraded(address indexed implementation);

    address private _implementation;

    constructor(address implementation_) {
        _setImplementation(implementation_);
    }

    function implementation() external view override returns (address) {
        return _implementation;
    }

    function upgradeTo(address newImplementation) external {
        _setImplementation(newImplementation);
    }

    function _setImplementation(address newImplementation) private {
        if (newImplementation.code.length == 0) {
            revert InvalidImplementation(newImplementation);
        }

        _implementation = newImplementation;
        emit Upgraded(newImplementation);
    }
}
