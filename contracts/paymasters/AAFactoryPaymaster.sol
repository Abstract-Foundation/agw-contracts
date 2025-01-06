// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";
import {
    IPaymaster,
    ExecutionResult,
    PAYMASTER_VALIDATION_SUCCESS_MAGIC
} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymaster.sol";
import {AccountFactory} from "../AccountFactory.sol";

import {BOOTLOADER_FORMAL_ADDRESS} from "@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol";
/**
 * This Paymaster sponsors the gas for any user attempting to deploy an AGW account for themselves
 * It also allows the canonical AGW deployer to sponsor deployments for users
 */

contract AAFactoryPaymaster is IPaymaster {
    error OnlyDeployer();
    error OnlyBootloader();
    error MustCallAAFactory();
    error MustCallCreateAccount();
    error InvalidDeployer();
    error WithdrawalFailed();
    error BootloaderCallFailed();

    address public immutable AA_FACTORY;
    address private immutable _deployer;

    constructor(address _aaFactory) {
        AA_FACTORY = _aaFactory;
        _deployer = msg.sender;
    }

    function validateAndPayForPaymasterTransaction(bytes32, bytes32, Transaction calldata _transaction)
        external
        payable
        returns (bytes4 magic, bytes memory context)
    {
        if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            revert OnlyBootloader();
        }

        if (address(uint160(_transaction.to)) != AA_FACTORY) {
            revert MustCallAAFactory();
        }

        if (bytes4(_transaction.data[0:4]) != AccountFactory.deployAccount.selector) {
            revert MustCallCreateAccount();
        }

        if (!AccountFactory(AA_FACTORY).authorizedDeployers(address(uint160(_transaction.from)))) {
            revert InvalidDeployer();
        }

        context = "";
        magic = PAYMASTER_VALIDATION_SUCCESS_MAGIC;

        uint256 requiredETH = _transaction.gasLimit * _transaction.maxFeePerGas;

        (bool success,) = BOOTLOADER_FORMAL_ADDRESS.call{value: requiredETH}("");
        if (!success) {
            revert BootloaderCallFailed();
        }
    }

    function postTransaction(
        bytes calldata _context,
        Transaction calldata _transaction,
        bytes32 _txHash,
        bytes32 _suggestedSignedHash,
        ExecutionResult _txResult,
        uint256 _maxRefundedGas
    ) external payable {}

    function withdraw() external {
        if (msg.sender != _deployer) {
            revert OnlyDeployer();
        }

        (bool success,) = _deployer.call{value: address(this).balance}("");
        if (!success) {
            revert WithdrawalFailed();
        }
    }

    receive() external payable {}
}
