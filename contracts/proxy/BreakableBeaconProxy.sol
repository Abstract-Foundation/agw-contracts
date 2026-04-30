// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

contract BreakableBeaconProxy is Proxy {
    constructor(address beacon) {
        ERC1967Utils.upgradeBeaconToAndCall(beacon, new bytes(0));
    }

    function _implementation() internal view override returns (address) {
        address beacon = ERC1967Utils.getBeacon();
        if (beacon != address(0)) {
            return IBeacon(beacon).implementation();
        }
        return ERC1967Utils.getImplementation();
    }
}
