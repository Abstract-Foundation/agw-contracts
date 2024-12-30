// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {DEPLOYER_SYSTEM_CONTRACT, IContractDeployer} from '@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol';
import {SystemContractsCaller} from '@matterlabs/zksync-contracts/l2/system-contracts/libraries/SystemContractsCaller.sol';
import {Ownable, Ownable2Step} from '@openzeppelin/contracts/access/Ownable2Step.sol';
import {EfficientCall} from '@matterlabs/zksync-contracts/l2/system-contracts/libraries/EfficientCall.sol';
import {Errors} from './libraries/Errors.sol';
import {IAGWRegistry} from './interfaces/IAGWRegistry.sol';

/**
 * @title Factory contract to create AGW accounts
 * @dev Forked from Clave for Abstract
 * @author https://abs.xyz
 * @author https://getclave.io
 */
contract AccountFactory is Ownable2Step {
    // Address of the account implementation 
    address public implementationAddress;
    // Selector of the account initializer function
    bytes4 public initializerSelector;

    // Account registry contract address
    address public registry;

    // Account creation bytecode hash
    bytes32 public proxyBytecodeHash;
    // Account authorized to deploy AGW accounts
    address public deployer;
    // Mapping to store the deployer of each account
    mapping (address => address) public accountToDeployer;

    /**
     * @notice Event emmited when a new AGW account is created
     * @param accountAddress Address of the newly created AGW account
     */
    event AGWAccountCreated(address indexed accountAddress);

    /**
     * @notice Event emmited when a new AGW account is deployed
     * @param accountAddress Address of the newly deployed AGW account
     */
    event AGWAccountDeployed(address indexed accountAddress);

    /**
     * @notice Event emmited when the deployer account is changed
     * @param newDeployer Address of the new deployer account
     */
    event DeployerChanged(address indexed newDeployer);

    /**
     * @notice Event emmited when the implementation contract is changed
     * @param newImplementation Address of the new implementation contract
     */
    event ImplementationChanged(address indexed newImplementation);

    /**
     * @notice Event emmited when the registry contract is changed
     * @param newRegistry Address of the new registry contract
     */
    event RegistryChanged(address indexed newRegistry);

    /**
     * @notice Constructor function of the factory contract
     * @param _implementation address     - Address of the implementation contract
     * @param _registry address           - Address of the registry contract
     * @param _proxyBytecodeHash address - Hash of the bytecode of the AGW proxy contract
     * @param _deployer address           - Address of the account authorized to deploy AGW accounts
     */
    constructor(
        address _implementation,
        bytes4 _initializerSelector,
        address _registry,
        bytes32 _proxyBytecodeHash,
        address _deployer,
        address _owner
    ) Ownable(_owner) {
        implementationAddress = _implementation;
        initializerSelector = _initializerSelector;
        registry = _registry;
        proxyBytecodeHash = _proxyBytecodeHash;
        deployer = _deployer;
    }

    /**
     * @notice Deploys a new AGW account
     * @dev Account address depends only on salt
     * @param salt bytes32             - Salt to be used for the account creation
     * @param initializer bytes memory - Initializer data for the account
     * @return accountAddress address - Address of the newly created AGW account
     */
    function deployAccount(
        bytes32 salt,
        bytes calldata initializer
    ) external payable returns (address accountAddress) {
        // Check that the initializer is not empty
        if (initializer.length < 4) {
            revert Errors.INVALID_INITIALIZER();
        }
        // Check that the initializer selector is correct
        {
            bytes4 selector = bytes4(initializer[0:4]);
            if (selector != initializerSelector) {
                revert Errors.INVALID_INITIALIZER();
            }
        }
        // Deploy the implementation contract
        (bool success, bytes memory returnData) = SystemContractsCaller.systemCallWithReturndata(
            uint32(gasleft()),
            address(DEPLOYER_SYSTEM_CONTRACT),
            uint128(0),
            abi.encodeCall(
                DEPLOYER_SYSTEM_CONTRACT.create2Account,
                (
                    salt,
                    proxyBytecodeHash,
                    abi.encode(implementationAddress),
                    IContractDeployer.AccountAbstractionVersion.Version1
                )
            )
        );

        if (!success) {
            revert Errors.DEPLOYMENT_FAILED();
        }

        // Decode the account address
        (accountAddress) = abi.decode(returnData, (address));
        // Store the deployer of the account
        accountToDeployer[accountAddress] = msg.sender;
        
        // This propagates the revert if the initialization fails
        EfficientCall.call(gasleft(), accountAddress, msg.value, initializer, false);

        IAGWRegistry(registry).register(accountAddress);

        emit AGWAccountDeployed(accountAddress);
    }

    /**
     * @notice To emit an event when a AGW account is created but not yet deployed
     * @dev This event is so that we can index accounts that are created but not yet deployed
     * @param accountAddress address - Address of the AGW account that was created
     */
    function agwAccountCreated(address accountAddress) external {
        if (msg.sender != deployer) {
            revert Errors.NOT_FROM_DEPLOYER();
        }
        emit AGWAccountCreated(accountAddress);
    }

    /**
     * @notice Changes the account authorized to deploy AGW accounts
     * @param newDeployer address - Address of the new account authorized to deploy AGW accounts
     */
    function changeDeployer(address newDeployer) external onlyOwner {
        deployer = newDeployer;

        emit DeployerChanged(newDeployer);
    }

    /**
     * @notice Changes the implementation contract address
     * @param newImplementation address - Address of the new implementation contract
     */
    function changeImplementation(address newImplementation, bytes4 newInitializerSelector) external onlyOwner {
        implementationAddress = newImplementation;
        initializerSelector = newInitializerSelector;

        emit ImplementationChanged(newImplementation);
    }

    /**
     * @notice Changes the registry contract address
     * @param newRegistry address - Address of the new registry contract
     */
    function changeRegistry(address newRegistry) external onlyOwner {
        registry = newRegistry;

        emit RegistryChanged(newRegistry);
    }

    /**
     * @notice Returns the address of the AGW account that would be created with the given salt
     * @param salt bytes32 - Salt to be used for the account creation
     * @return accountAddress address - Address of the AGW account that would be created with the given salt
     */
    function getAddressForSalt(bytes32 salt) external view returns (address accountAddress) {
        accountAddress = IContractDeployer(DEPLOYER_SYSTEM_CONTRACT).getNewAddressCreate2(
            address(this),
            proxyBytecodeHash,
            salt,
            abi.encode(implementationAddress)
        );
    }

    /**
     * @notice Returns the address of the AGW account that would be created with the given salt and implementation
     * @param salt bytes32 - Salt to be used for the account creation
     * @param _implementation address - Address of the implementation contract
     * @return accountAddress address - Address of the AGW account that would be created with the given salt and implementation
     */
    function getAddressForSaltAndImplementation(
        bytes32 salt,
        address _implementation
    ) external view returns (address accountAddress) {
        accountAddress = IContractDeployer(DEPLOYER_SYSTEM_CONTRACT).getNewAddressCreate2(
            address(this),
            proxyBytecodeHash,
            salt,
            abi.encode(_implementation)
        );
    }
}
