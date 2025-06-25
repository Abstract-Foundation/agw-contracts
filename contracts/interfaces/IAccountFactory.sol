// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccountFactory {
    function deployAccount(bytes32 salt, bytes calldata initializer)
        external
        payable
        returns (address accountAddress);

    function authorizedDeployers(address) external view returns (bool);
}
