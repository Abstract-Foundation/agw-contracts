// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

enum PolicyType {
    Call,
    Transfer,
    ApprovalTarget
}

enum Status {
    Unset,
    Allowed,
    Blocked
}

contract SessionKeyPolicyRegistry is AccessControlUpgradeable, UUPSUpgradeable {
    event PolicyStatusChanged(
        PolicyType indexed policyType, address indexed target, bytes32 indexed data, Status status
    );

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => Status) private _policyStatus;

    constructor() {
        _disableInitializers();
    }

    function initialize(address owner) public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MANAGER_ROLE, owner);
    }

    function setCallPolicyStatus(address target, bytes4 selector, Status status) public onlyRole(MANAGER_ROLE) {
        _setPolicyStatus(PolicyType.Call, target, selector, status);
    }

    function setTransferPolicyStatus(address target, Status status) public onlyRole(MANAGER_ROLE) {
        _setPolicyStatus(PolicyType.Transfer, target, bytes4(0), status);
    }

    function setApprovalTargetStatus(address token, address target, Status status) public onlyRole(MANAGER_ROLE) {
        _setPolicyStatus(PolicyType.ApprovalTarget, token, bytes32(uint256(uint160(target))), status);
    }

    function getCallPolicyStatus(address target, bytes4 selector) public view returns (Status) {
        return _getPolicyStatus(PolicyType.Call, target, selector);
    }

    function getTransferPolicyStatus(address target) public view returns (Status) {
        return _getPolicyStatus(PolicyType.Transfer, target, bytes4(0));
    }

    function getApprovalTargetStatus(address token, address target) public view returns (Status) {
        return _getPolicyStatus(PolicyType.ApprovalTarget, token, bytes32(uint256(uint160(target))));
    }

    function _setPolicyStatus(PolicyType policyType, address target, bytes32 data, Status status) internal {
        _policyStatus[keccak256(abi.encodePacked(policyType, target, data))] = status;

        emit PolicyStatusChanged(policyType, target, data, status);
    }

    function _getPolicyStatus(PolicyType policyType, address target, bytes32 data) internal view returns (Status) {
        return _policyStatus[keccak256(abi.encodePacked(policyType, target, data))];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
