// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {SystemContractsCaller} from '@matterlabs/zksync-contracts/contracts/system-contracts/libraries/SystemContractsCaller.sol';
import {EfficientCall} from '@matterlabs/zksync-contracts/contracts/system-contracts/libraries/EfficientCall.sol';
import { DEPLOYER_SYSTEM_CONTRACT } from "@matterlabs/zksync-contracts/contracts/system-contracts/Constants.sol";
import {Errors} from '../libraries/Errors.sol';
import {SelfAuth} from '../auth/SelfAuth.sol';
// Each call data for batches
struct Call {
    address target; // Target contract address
    bool allowFailure; // Whether to revert if the call fails
    uint256 value; // Amount of ETH to send with call
    bytes callData; // Calldata to send
}

/// @title BatchCaller
/// @notice Make multiple calls in a single transaction
abstract contract BatchCaller is SelfAuth {
  /// @notice Make multiple calls, ensure success if required.
  /// @dev The total Ether sent across all calls must be equal to `msg.value` to maintain the invariant
  /// that `msg.value` + `tx.fee` is the maximum amount of Ether that can be spent on the transaction.
  /// @param _calls Array of Call structs, each representing an individual external call to be made.
  function batchCall(Call[] calldata _calls) external payable onlySelf {
    uint256 totalValue;
    uint256 len = _calls.length;
    for (uint256 i = 0; i < len; ++i) {
      totalValue += _calls[i].value;
      bool success;
      if (_calls[i].target == address(DEPLOYER_SYSTEM_CONTRACT)) {
        // Note, that the deployer contract can only be called with a "systemCall" flag.
        success = SystemContractsCaller.systemCall(
          uint32(gasleft()),
          _calls[i].target,
          _calls[i].value,
          _calls[i].callData
        );
      } else {
        success = EfficientCall.rawCall(gasleft(), _calls[i].target, _calls[i].value, _calls[i].callData, false);
      }

      if (!_calls[i].allowFailure && !success) {
        revert Errors.CALL_FAILED();
      }
    }

    if (totalValue != msg.value) {
      revert Errors.MsgValueMismatch(msg.value, totalValue);
    }
  }
}
