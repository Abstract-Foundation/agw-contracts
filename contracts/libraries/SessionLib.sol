// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import { Transaction } from "@matterlabs/zksync-contracts/contracts/system-contracts/libraries/TransactionHelper.sol";
import { IPaymasterFlow } from "@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IPaymasterFlow.sol";
import { TimestampAsserterLocator } from "../helpers/TimestampAsserterLocator.sol";

library SessionLib {
  using SessionLib for SessionLib.Constraint;
  using SessionLib for SessionLib.UsageLimit;

  // We do not permit session keys to be reused to open multiple sessions
  // (after one expires or is closed, e.g.).
  // For each session key, its session status can only be changed
  // from NotInitialized to Active, and from Active to Closed.
  enum Status {
    NotInitialized,
    Active,
    Closed,
    Expired
  }

  // This struct is used to track usage information for each session.
  // Along with `status`, this is considered the session state.
  // While everything else is considered the session spec, and is stored offchain.
  // Storage layout of this struct is weird to conform to ERC-7562 storage access restrictions during validation.
  // Each innermost mapping is always mapping(address account => ...).
  struct SessionStorage {
    uint256 expiresAt;
    mapping(address => Status) status;
    UsageTracker fee;
    // (target) => transfer value tracker
    mapping(address => UsageTracker) transferValue;
    // (target, selector) => call value tracker
    mapping(address => mapping(bytes4 => UsageTracker)) callValue;
    // (target, selector, index) => call parameter tracker
    // index is the constraint index in callPolicy, not the parameter index
    mapping(address => mapping(bytes4 => mapping(uint256 => UsageTracker))) params;
  }

  struct Constraint {
    Condition condition;
    uint64 index;
    bytes32 refValue;
    UsageLimit limit;
  }

  struct UsageTracker {
    // Used for LimitType.Lifetime
    mapping(address => uint256) lifetimeUsage;
    // Used for LimitType.Allowance
    // period => used that period
    mapping(uint64 => mapping(address => uint256)) allowanceUsage;
  }

  struct UsageLimit {
    LimitType limitType;
    uint256 limit; // ignored if limitType == Unlimited
    uint256 period; // ignored if limitType != Allowance
  }

  enum LimitType {
    Unlimited,
    Lifetime,
    Allowance
  }

  enum Condition {
    Unconstrained,
    Equal,
    Greater,
    Less,
    GreaterOrEqual,
    LessOrEqual,
    NotEqual
  }

  struct SessionSpec {
    address signer;
    uint256 expiresAt;
    UsageLimit feeLimit;
    CallSpec[] callPolicies;
    TransferSpec[] transferPolicies;
  }

  struct CallSpec {
    address target;
    bytes4 selector;
    uint256 maxValuePerUse;
    UsageLimit valueLimit;
    Constraint[] constraints;
    // add max data length restriction?
    // add max number of calls restriction?
  }

  struct TransferSpec {
    address target;
    uint256 maxValuePerUse;
    UsageLimit valueLimit;
  }

  struct LimitState {
    // this might also be limited by a constraint or `maxValuePerUse`,
    // which is not reflected here
    uint256 remaining;
    address target;
    // ignored for transfer value
    bytes4 selector;
    // ignored for transfer and call value
    uint256 index;
  }

  // Info about remaining session limits and its status
  struct SessionState {
    uint256 expiresAt;
    Status status;
    uint256 feesRemaining;
    LimitState[] transferValue;
    LimitState[] callValue;
    LimitState[] callParams;
  }

  function checkAndUpdate(
    UsageLimit memory limit,
    UsageTracker storage tracker,
    uint256 value,
    uint64 period
  ) internal {
    if (limit.limitType == LimitType.Lifetime) {
      require(tracker.lifetimeUsage[msg.sender] + value <= limit.limit, "Lifetime limit exceeded");
      tracker.lifetimeUsage[msg.sender] += value;
    }
    if (limit.limitType == LimitType.Allowance) {
      TimestampAsserterLocator.locate().assertTimestampInRange(period * limit.period, (period + 1) * limit.period);
      require(tracker.allowanceUsage[period][msg.sender] + value <= limit.limit, "Allowance limit exceeded");
      tracker.allowanceUsage[period][msg.sender] += value;
    }
  }

  function checkAndUpdate(
    Constraint memory constraint,
    UsageTracker storage tracker,
    bytes calldata data,
    uint64 period
  ) internal {
    uint256 index = 4 + constraint.index * 32;
    bytes32 param = bytes32(data[index:index + 32]);
    Condition condition = constraint.condition;
    bytes32 refValue = constraint.refValue;

    if (condition == Condition.Equal) {
      require(param == refValue, "EQUAL constraint not met");
    } else if (condition == Condition.Greater) {
      require(param > refValue, "GREATER constraint not met");
    } else if (condition == Condition.Less) {
      require(param < refValue, "LESS constraint not met");
    } else if (condition == Condition.GreaterOrEqual) {
      require(param >= refValue, "GREATER_OR_EQUAL constraint not met");
    } else if (condition == Condition.LessOrEqual) {
      require(param <= refValue, "LESS_OR_EQUAL constraint not met");
    } else if (condition == Condition.NotEqual) {
      require(param != refValue, "NOT_EQUAL constraint not met");
    }

    constraint.limit.checkAndUpdate(tracker, uint256(param), period);
  }

  function validateFeeLimit(
    SessionStorage storage state,
    Transaction calldata transaction,
    SessionSpec memory spec,
    uint64 periodId
  ) internal {
    // This is split from `validate` to prevent gas estimation failures.
    // When this check was part of `validate`, gas estimation could fail due to
    // fee limit being smaller than the upper bound of the gas estimation binary search.
    // By splitting this check, we can now have this order of operations in `validateTransaction`:
    // 1. session.validate()
    // 2. ECDSA.tryRecover()
    // 3. session.validateFeeLimit()
    // This way, gas estimation will exit on step 2 instead of failing, but will still run through
    // most of the computation needed to validate the session.

    // TODO: update fee allowance with the gasleft/refund at the end of execution
    if (transaction.paymaster == 0) {
      // If a paymaster is paying the fee, we don't need to check the fee limit
      uint256 fee = transaction.maxFeePerGas * transaction.gasLimit;
      spec.feeLimit.checkAndUpdate(state.fee, fee, periodId);
    }
  }

  function validate(
    SessionStorage storage state,
    Transaction calldata transaction,
    SessionSpec memory spec,
    uint64[] memory periodIds
  ) internal {
    // Here we additionally pass uint64[] periodId to check allowance limits
    // periodId is defined as block.timestamp / limit.period if limitType == Allowance, and 0 otherwise (which will be ignored).
    // periodIds[0] is for fee limit,
    // periodIds[1] is for value limit,
    // periodIds[2:] are for call constraints, if there are any.
    // It is required to pass them in (instead of computing via block.timestamp) since during validation
    // we can only assert the range of the timestamp, but not access its value.

    require(state.status[msg.sender] == Status.Active, "Session is not active");
    TimestampAsserterLocator.locate().assertTimestampInRange(0, spec.expiresAt);

    address target = address(uint160(transaction.to));

    if (transaction.paymasterInput.length >= 4) {
      bytes4 paymasterInputSelector = bytes4(transaction.paymasterInput[0:4]);
      require(
        paymasterInputSelector != IPaymasterFlow.approvalBased.selector,
        "Approval based paymaster flow not allowed"
      );
    }

    if (transaction.data.length >= 4) {
      // Disallow self-targeting transactions with session keys as these have the ability to administer
      // the smart account.
      require(address(uint160(transaction.to)) != msg.sender, "Can not target self");
      require(address(uint160(transaction.to)) != address(this), "Can not manage session keys");

      bytes4 selector = bytes4(transaction.data[:4]);
      CallSpec memory callPolicy;
      bool found = false;

      for (uint256 i = 0; i < spec.callPolicies.length; i++) {
        if (spec.callPolicies[i].target == target && spec.callPolicies[i].selector == selector) {
          callPolicy = spec.callPolicies[i];
          found = true;
          break;
        }
      }

      require(found, "Call to this contract is not allowed");
      require(transaction.value <= callPolicy.maxValuePerUse, "Value exceeds limit");
      callPolicy.valueLimit.checkAndUpdate(state.callValue[target][selector], transaction.value, periodIds[1]);

      for (uint256 i = 0; i < callPolicy.constraints.length; i++) {
        callPolicy.constraints[i].checkAndUpdate(state.params[target][selector][i], transaction.data, periodIds[i + 2]);
      }
    } else {
      TransferSpec memory transferPolicy;
      bool found = false;

      for (uint256 i = 0; i < spec.transferPolicies.length; i++) {
        if (spec.transferPolicies[i].target == target) {
          transferPolicy = spec.transferPolicies[i];
          found = true;
          break;
        }
      }

      require(found, "Transfer to this address is not allowed");
      require(transaction.value <= transferPolicy.maxValuePerUse, "Value exceeds limit");
      transferPolicy.valueLimit.checkAndUpdate(state.transferValue[target], transaction.value, periodIds[1]);
    }
  }

  function remainingLimit(
    UsageLimit memory limit,
    UsageTracker storage tracker,
    address account
  ) internal view returns (uint256) {
    if (limit.limitType == LimitType.Unlimited) {
      // this might be still limited by `maxValuePerUse` or a constraint
      return type(uint256).max;
    }
    if (limit.limitType == LimitType.Lifetime) {
      return limit.limit - tracker.lifetimeUsage[account];
    }
    if (limit.limitType == LimitType.Allowance) {
      // this is not used during validation, so it's fine to use block.timestamp
      uint64 period = uint64(block.timestamp / limit.period);
      return limit.limit - tracker.allowanceUsage[period][account];
    }
  }

  function getState(
    SessionStorage storage session,
    address account,
    SessionSpec calldata spec
  ) internal view returns (SessionState memory) {
    uint256 totalConstraints = 0;
    for (uint256 i = 0; i < spec.callPolicies.length; i++) {
      totalConstraints += spec.callPolicies[i].constraints.length;
    }

    LimitState[] memory transferValue = new LimitState[](spec.transferPolicies.length);
    LimitState[] memory callValue = new LimitState[](spec.callPolicies.length);
    LimitState[] memory callParams = new LimitState[](totalConstraints); // there will be empty ones at the end
    uint256 paramLimitIndex = 0;

    for (uint256 i = 0; i < transferValue.length; i++) {
      TransferSpec memory transferSpec = spec.transferPolicies[i];
      transferValue[i] = LimitState({
        remaining: remainingLimit(transferSpec.valueLimit, session.transferValue[transferSpec.target], account),
        target: spec.transferPolicies[i].target,
        selector: bytes4(0),
        index: 0
      });
    }

    for (uint256 i = 0; i < callValue.length; i++) {
      CallSpec memory callSpec = spec.callPolicies[i];
      callValue[i] = LimitState({
        remaining: remainingLimit(callSpec.valueLimit, session.callValue[callSpec.target][callSpec.selector], account),
        target: callSpec.target,
        selector: callSpec.selector,
        index: 0
      });

      for (uint256 j = 0; j < callSpec.constraints.length; j++) {
        if (callSpec.constraints[j].limit.limitType != LimitType.Unlimited) {
          callParams[paramLimitIndex++] = LimitState({
            remaining: remainingLimit(
              callSpec.constraints[j].limit,
              session.params[callSpec.target][callSpec.selector][j],
              account
            ),
            target: callSpec.target,
            selector: callSpec.selector,
            index: callSpec.constraints[j].index
          });
        }
      }
    }

    // shrink array to actual size
    assembly {
      mstore(callParams, paramLimitIndex)
    }

    Status status = session.status[account];
    if (status == Status.Active) {
      if (block.timestamp > session.expiresAt) {
        status = Status.Expired;
      }
    }

    return
      SessionState({
        expiresAt: session.expiresAt,
        status: status,
        feesRemaining: remainingLimit(spec.feeLimit, session.fee, account),
        transferValue: transferValue,
        callValue: callValue,
        callParams: callParams
      });
  }
}
