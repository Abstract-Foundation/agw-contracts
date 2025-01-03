// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {IERC1271} from '@openzeppelin/contracts/interfaces/IERC1271.sol';

import {SignatureDecoder} from '../libraries/SignatureDecoder.sol';
import {ValidationHandler} from './ValidationHandler.sol';
import {EIP712Upgradeable} from '@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol';
import {OperationType} from '../interfaces/IValidator.sol';

/**
 * @title ERC1271Handler
 * @notice Contract which provides ERC1271 signature validation
 * @dev Forked from Clave for Abstract
 * @author https://getclave.io
 * @author https://abs.xyz
 */
abstract contract ERC1271Handler is
    IERC1271,
    EIP712Upgradeable,
    ValidationHandler
{
    struct AGWMessage {
        bytes32 signedHash;
    }

    bytes32 constant _AGW_MESSAGE_TYPEHASH = keccak256('AGWMessage(bytes32 signedHash)');

    bytes4 private constant _ERC1271_MAGIC = 0x1626ba7e;

    function __ERC1271Handler_init() internal onlyInitializing {
        __EIP712_init('AbstractGlobalWallet', '1.0.0');
    }

    /**
     * @dev Should return whether the signature provided is valid for the provided data
     * @param signedHash bytes32                   - Hash of the data that is signed
     * @param signatureAndValidator bytes calldata - Validator address concatenated to signature
     * @return magicValue bytes4 - Magic value if the signature is valid, 0 otherwise
     */
    function isValidSignature(
        bytes32 signedHash,
        bytes memory signatureAndValidator
    ) public view override returns (bytes4 magicValue) {
        (bytes memory signature, address validator) = SignatureDecoder.decodeSignatureNoHookData(
            signatureAndValidator
        );

        bytes32 eip712Hash = _hashTypedDataV4(_agwMessageHash(AGWMessage(signedHash)));

        bool valid = _handleValidation(validator, OperationType.Signature, eip712Hash, signature);

        magicValue = valid ? _ERC1271_MAGIC : bytes4(0);
    }

    /**
     * @notice Returns the EIP-712 hash of the AGW message
     * @param agwMessage AGWMessage calldata - The message containing signedHash
     * @return bytes32 - EIP712 hash of the message
     */
    function getEip712Hash(AGWMessage calldata agwMessage) external view returns (bytes32) {
        return _hashTypedDataV4(_agwMessageHash(agwMessage));
    }

    /**
     * @notice Returns the typehash for the AGW message struct
     * @return bytes32 - AGW message typehash
     */
    function agwMessageTypeHash() external pure returns (bytes32) {
        return _AGW_MESSAGE_TYPEHASH;
    }

    function _agwMessageHash(AGWMessage memory agwMessage) internal pure returns (bytes32) {
        return keccak256(abi.encode(_AGW_MESSAGE_TYPEHASH, agwMessage.signedHash));
    }
}
