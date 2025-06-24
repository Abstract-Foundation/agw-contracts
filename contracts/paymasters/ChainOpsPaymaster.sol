// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Transaction} from "@matterlabs/zksync-contracts/contracts/system-contracts/libraries/TransactionHelper.sol";
import {
    IPaymaster,
    ExecutionResult,
    PAYMASTER_VALIDATION_SUCCESS_MAGIC
} from "@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IPaymaster.sol";
import {AccountFactory} from "../AccountFactory.sol";
import {BOOTLOADER_FORMAL_ADDRESS} from "@matterlabs/zksync-contracts/contracts/system-contracts/Constants.sol";
import {OwnableRoles} from "solady/src/auth/OwnableRoles.sol";
import {SafeTransferLib} from "solady/src/utils/ext/zksync/SafeTransferLib.sol";

contract ChainOpsPaymaster is OwnableRoles, IPaymaster {
    using SafeTransferLib for address;

    error OnlyBootloader();
    error WithdrawalFailed();
    error BootloaderCallFailed();
    error SponsorshipRefused();

    uint256 public constant MANAGER_ROLE = _ROLE_0;

    AccountFactory public immutable AA_FACTORY;
    address private immutable _deployer;

    mapping(address from => bool sponsored) public sponsoredAccounts;
    mapping(address from => mapping(address to => mapping(bytes4 selector => bool sponsored))) public sponsoredCalls;

    constructor(address owner, address aaFactory) {
        AA_FACTORY = AccountFactory(aaFactory);
        _initializeOwner(owner);
        _grantRole(MANAGER_ROLE, owner);
    }

    function validateAndPayForPaymasterTransaction(bytes32, bytes32, Transaction calldata _transaction)
        external
        payable
        returns (bytes4 magic, bytes memory context)
    {
        if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            revert OnlyBootloader();
        }

        bool shouldSponsor = false;

        address from = address(uint160(_transaction.from));
        address to = address(uint160(_transaction.to));

        bytes4 selector;
        if (_transaction.data.length > 4) {
            selector = bytes4(_transaction.data[0:4]);
        }

        if (to == address(AA_FACTORY)) {
            if (selector == AccountFactory.deployAccount.selector) {
                if (AccountFactory(AA_FACTORY).authorizedDeployers(from)) {
                    shouldSponsor = true;
                }
            }
        }

        if (!shouldSponsor) {
            if (sponsoredAccounts[from]) {
                shouldSponsor = true;
            } else if (sponsoredCalls[from][to][selector]) {
                shouldSponsor = true;
            }
        }

        if (!shouldSponsor) {
            revert SponsorshipRefused();
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

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        uint256 balance = address(this).balance;
        if (amount > balance) {
            amount = balance;
        }
        (bool success,) = to.call{value: amount}("");
        if (!success) {
            revert WithdrawalFailed();
        }
    }

    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }

    function rescueERC721(address token, address to, uint256 tokenId) external onlyOwner {
        token.safeTransferFrom(address(this), to, tokenId);
    }

    function setSponsoredAccount(address from, bool sponsored) external onlyRolesOrOwner(MANAGER_ROLE) {
        sponsoredAccounts[from] = sponsored;
    }

    function setSponsoredCall(address from, address to, bytes4 selector, bool sponsored)
        external
        onlyRolesOrOwner(MANAGER_ROLE)
    {
        sponsoredCalls[from][to][selector] = sponsored;
    }

    receive() external payable {}
}
