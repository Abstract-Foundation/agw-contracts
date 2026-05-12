// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

interface IAGWRegistryV2 {
    function register(address account, uint8 version) external;

    function isAGW(address account) external view returns (bool);

    function isAGWVersion(
        address account,
        uint8 version
    ) external view returns (bool);

    function versionOf(address account) external view returns (uint8);
}
