// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {IAccount} from '@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IAccount.sol';

import {IERC1271} from '@openzeppelin/contracts/interfaces/IERC1271.sol';
import {IERC777Recipient} from '@openzeppelin/contracts/interfaces/IERC777Recipient.sol';
import {IERC721Receiver} from '@openzeppelin/contracts/interfaces/IERC721Receiver.sol';
import {IERC1155Receiver} from '@openzeppelin/contracts/interfaces/IERC1155Receiver.sol';

import {IHookManager} from './IHookManager.sol';
import {IModuleManager} from './IModuleManager.sol';
import {IOwnerManager} from './IOwnerManager.sol';
import {IUpgradeManager} from './IUpgradeManager.sol';
import {IValidatorManager} from './IValidatorManager.sol';

/**
 * @title IAGWAccount
 * @notice Interface for the AGW contract
 * @dev Implementations of this interface are contracts that can be used as an AGW account
 * @dev Forked from Clave for Abstract
 * @author https://getclave.io
 * @author https://abs.xyz
 */
interface IAGWAccount is
    IERC1271,
    IERC721Receiver,
    IERC1155Receiver,
    IHookManager,
    IModuleManager,
    IOwnerManager,
    IValidatorManager,
    IUpgradeManager,
    IAccount
{
    event FeePaid();
}
