// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {IERC1822Proxiable} from "@openzeppelin/contracts/interfaces/draft-IERC1822.sol";
import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";

abstract contract BreakableUpgradeable is UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable __breakableSelf = address(this);

    error InvalidBeaconImplementation(address implementation);
    event BeaconBroken(address indexed beacon, address indexed implementation);

    /// @dev Authorizes the upgrade, detaches from a beacon if needed, and then performs a standard UUPS upgrade.
    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) public payable virtual override onlyProxy {
        _authorizeUpgrade(newImplementation);
        _breakBeacon();
        _upgradeToAndCallUUPSBreakable(newImplementation, data);
    }

    /// @dev Detaches a BreakableBeaconProxy by freezing this implementation in the ERC-1967 implementation slot.
    function _breakBeacon() internal virtual {
        _checkProxy();

        address beacon = ERC1967Utils.getBeacon();
        if (beacon == address(0)) {
            return;
        }

        address implementation = IBeacon(beacon).implementation();
        if (implementation != __breakableSelf) {
            revert InvalidBeaconImplementation(implementation);
        }

        StorageSlot
            .getAddressSlot(ERC1967Utils.IMPLEMENTATION_SLOT)
            .value = implementation;
        StorageSlot.getAddressSlot(ERC1967Utils.BEACON_SLOT).value = address(0);

        emit BeaconBroken(beacon, implementation);
    }

    function _checkProxy() internal view virtual override {
        address beacon = ERC1967Utils.getBeacon();
        if (address(this) == __breakableSelf) {
            revert UUPSUnauthorizedCallContext();
        } else if (beacon == address(0)) {
            super._checkProxy();
        } else if (IBeacon(beacon).implementation() != __breakableSelf) {
            revert UUPSUnauthorizedCallContext();
        }
    }

    function _upgradeToAndCallUUPSBreakable(
        address newImplementation,
        bytes memory data
    ) private {
        try IERC1822Proxiable(newImplementation).proxiableUUID() returns (
            bytes32 slot
        ) {
            if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
                revert UUPSUnsupportedProxiableUUID(slot);
            }
            ERC1967Utils.upgradeToAndCall(newImplementation, data);
        } catch {
            revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
        }
    }
}
