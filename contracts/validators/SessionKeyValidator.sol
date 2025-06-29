// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import { IModule } from "../interfaces/IModule.sol";
import { IValidationHook } from "../interfaces/IHook.sol";
import { IModuleValidator } from "../interfaces/IModuleValidator.sol";
import { OperationType } from "../interfaces/IValidator.sol";
import { Transaction } from "@matterlabs/zksync-contracts/contracts/system-contracts/libraries/TransactionHelper.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import { IHookManager } from "../interfaces/IHookManager.sol";
import { IValidatorManager } from "../interfaces/IValidatorManager.sol";
import { SessionLib } from "../libraries/SessionLib.sol";

contract SessionKeyValidator is IValidationHook, IModuleValidator, IModule {
  using SessionLib for SessionLib.SessionStorage;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  event SessionCreated(address indexed account, bytes32 indexed sessionHash, SessionLib.SessionSpec sessionSpec);
  event SessionRevoked(address indexed account, bytes32 indexed sessionHash);

  // account => number of open sessions
  // NOTE: expired sessions are still counted if not explicitly revoked
  mapping(address => uint256) private sessionCounter;
  // session hash => session state
  mapping(bytes32 => SessionLib.SessionStorage) private sessions;

  function sessionState(
    address account,
    SessionLib.SessionSpec calldata spec
  ) external view returns (SessionLib.SessionState memory) {
    return sessions[keccak256(abi.encode(spec))].getState(account, spec);
  }

  function sessionStatus(address account, bytes32 sessionHash) external view returns (SessionLib.Status) {
    SessionLib.Status status = sessions[sessionHash].status[account];
    if (status == SessionLib.Status.Active) {
      if (block.timestamp > sessions[sessionHash].expiresAt) {
        return SessionLib.Status.Expired;
      }
    }
    return status;
  }

  function handleValidation(OperationType operationType, bytes32 signedHash, bytes memory signature) external view returns (bool) {
    if (operationType != OperationType.Transaction) {
      return false;
    }
    // This only succeeds if the validationHook has previously succeeded for this hash.
    uint256 slot = uint256(signedHash);
    uint256 hookResult;
    assembly {
      hookResult := tload(slot)
    }
    require(hookResult == 1, "Session key validation failed. Please check session status and limits.");
    return true;
  }

  function addValidationKey(bytes memory sessionData) external returns (bool) {
    if (sessionData.length == 0) {
      return false;
    }
    SessionLib.SessionSpec memory sessionSpec = abi.decode(sessionData, (SessionLib.SessionSpec));
    createSession(sessionSpec);
    return true;
  }

  function createSession(SessionLib.SessionSpec memory sessionSpec) public {
    bytes32 sessionHash = keccak256(abi.encode(sessionSpec));
    require(_isInitialized(msg.sender), "Account not initialized");
    require(sessionSpec.signer != address(0), "Invalid signer");
    require(sessions[sessionHash].status[msg.sender] == SessionLib.Status.NotInitialized, "Session already exists");
    require(sessionSpec.feeLimit.limitType != SessionLib.LimitType.Unlimited, "Unlimited fee allowance is not safe");
    sessionCounter[msg.sender]++;
    sessions[sessionHash].status[msg.sender] = SessionLib.Status.Active;
    sessions[sessionHash].expiresAt = sessionSpec.expiresAt;
    emit SessionCreated(msg.sender, sessionHash, sessionSpec);
  }

  function init(bytes calldata data) external {
    // to prevent recursion, since addHook also calls init
    if (!_isInitialized(msg.sender)) {
      // Ensure that all keys are revoked before installing the module again.
      // This is to prevent the module from being installed, used and installed
      // again later with dormant keys that could be used to execute transactions.
      require(sessionCounter[msg.sender] == 0, "Revoke all keys first");

      IHookManager(msg.sender).addHook(abi.encodePacked(address(this)), true);
      IValidatorManager(msg.sender).addModuleValidator(address(this), data);
    }
  }

  function disable() external {
    if (_isInitialized(msg.sender)) {
      IValidatorManager(msg.sender).removeModuleValidator(address(this));
      IHookManager(msg.sender).removeHook(address(this), true);
    }
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return
      interfaceId != 0xffffffff &&
      (interfaceId == type(IERC165).interfaceId ||
        interfaceId == type(IValidationHook).interfaceId ||
        interfaceId == type(IModuleValidator).interfaceId ||
        interfaceId == type(IModule).interfaceId);
  }

  // TODO: make the session owner able revoke its own key, in case it was leaked, to prevent further misuse?
  function revokeKey(bytes32 sessionHash) public {
    require(sessions[sessionHash].status[msg.sender] == SessionLib.Status.Active, "Nothing to revoke");
    sessions[sessionHash].status[msg.sender] = SessionLib.Status.Closed;
    sessionCounter[msg.sender]--;
    emit SessionRevoked(msg.sender, sessionHash);
  }

  function revokeKeys(bytes32[] calldata sessionHashes) external {
    for (uint256 i = 0; i < sessionHashes.length; i++) {
      revokeKey(sessionHashes[i]);
    }
  }

  /*
   * Check if the validator is registered for the smart account
   * @param smartAccount The smart account to check
   * @return true if validator is registered for the account, false otherwise
   */
  function isInited(address smartAccount) external view returns (bool) {
    return _isInitialized(smartAccount);
  }

  function _isInitialized(address smartAccount) internal view returns (bool) {
    return IHookManager(smartAccount).isHook(address(this));
  }  

  function validationHook(bytes32 signedHash, Transaction calldata transaction, bytes calldata hookData) external {
    if (hookData.length == 0) {
      // There's no session data so we aren't validating anything
      return;
    }
    (bytes memory signature, address validator, ) = abi.decode(transaction.signature, (bytes, address, bytes[]));
    if (validator != address(this)) {
      // This transaction is not meant to be validated by this module
      return;
    }
    (SessionLib.SessionSpec memory spec, uint64[] memory periodIds) = abi.decode(
      hookData,
      (SessionLib.SessionSpec, uint64[])
    );
    require(spec.signer != address(0), "Invalid signer (empty)");
    bytes32 sessionHash = keccak256(abi.encode(spec));
    // this generally throws instead of returning false
    sessions[sessionHash].validate(transaction, spec, periodIds);
    (address recoveredAddress, ECDSA.RecoverError recoverError, ) = ECDSA.tryRecover(signedHash, signature);
    if (recoverError != ECDSA.RecoverError.NoError || recoveredAddress == address(0)) {
      return;
    }
    require(recoveredAddress == spec.signer, "Invalid signer (mismatch)");
    // This check is separate and performed last to prevent gas estimation failures
    sessions[sessionHash].validateFeeLimit(transaction, spec, periodIds[0]);

    // Set the validation result to 1 for this hash, so that isValidSignature succeeds
    uint256 slot = uint256(signedHash);
    assembly {
      tstore(slot, 1)
    }
  }

  /**
   * The name of the module
   * @return name The name of the module
   */
  function name() external pure returns (string memory) {
    return "SessionKeyValidator";
  }

  /**
   * Currently in dev
   * @return version The version of the module
   */
  function version() external pure returns (string memory) {
    return "0.0.0";
  }
}
