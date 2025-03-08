// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {OperationType} from './IValidator.sol';

/**
 * @title Modular validator interface for native AA
 * @dev Add signature to module or validate existing signatures for account
 */
interface IModuleValidator {
  function handleValidation(OperationType operationType, bytes32 signedHash, bytes memory signature) external view returns (bool);

  function addValidationKey(bytes memory key) external returns (bool);
}