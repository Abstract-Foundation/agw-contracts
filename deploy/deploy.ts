/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import {
    AbiCoder,
    hexlify,
    keccak256,
    ZeroAddress,
    ZeroHash,
    zeroPadValue
} from 'ethers';
import * as hre from 'hardhat';
import { Contract, Wallet, utils } from 'zksync-ethers';
import { deployContract, getProvider, getWallet, verifyContract } from '../deploy/utils';
import type { CallStruct } from '../typechain-types/contracts/batch/BatchCaller';
let fundingWallet: Wallet;

let eoaValidator: Contract;
let implementation: Contract;
let factory: Contract;
let registry: Contract;

// An example of a basic deploy script
// Do not push modifications to this file
// Just modify, interact then revert changes
export default async function (): Promise<void> {
    fundingWallet = getWallet(hre);

    const initialOwner = fundingWallet.address;

    eoaValidator = await create2IfNotExists("EOAValidator", []);
    implementation = await create2IfNotExists("AGWAccount", [await eoaValidator.getAddress()]);
    registry = await create2IfNotExists("AGWRegistry", [initialOwner]);
    await create2IfNotExists("AccountProxy", [await implementation.getAddress()]);

    const accountProxyArtifact = await hre.zksyncEthers.loadArtifact('AccountProxy');
    const bytecodeHash = utils.hashBytecode(accountProxyArtifact.bytecode);
    console.log("bytecodeHash", hexlify(bytecodeHash));
    factory = await create2IfNotExists("AccountFactory", [await implementation.getAddress(), "0xb4e581f5", await registry.getAddress(), bytecodeHash, fundingWallet.address, initialOwner]);

    const factoryAddress = await factory.getAddress();
    const isFactory = await registry.isFactory(factoryAddress);
    if (!isFactory) {
        console.log("Setting factory in registry");
        await registry.setFactory(factoryAddress);
    }

    await create2IfNotExists("AAFactoryPaymaster", [await factory.getAddress()]);
    await create2IfNotExists("SessionKeyValidator", []);
    
    await deployAccountIfNotExists(initialOwner);
}


async function create2IfNotExists(contractName: string, constructorArguments: any[]): Promise<Contract> {

    const artifact = await hre.zksyncEthers.loadArtifact(contractName);
    const bytecodeHash = utils.hashBytecode(artifact.bytecode);

    const constructor = artifact.abi.find(abi => abi.type === "constructor");

    let encodedConstructorArguments = "0x";
    if (constructor) {
        encodedConstructorArguments = AbiCoder.defaultAbiCoder().encode(constructor.inputs, constructorArguments);
    }

    const address = utils.create2Address("0x0000000000000000000000000000000000010000", bytecodeHash, ZeroHash, encodedConstructorArguments);
    
    const provider = getProvider(hre);
    const code = await provider.getCode(address);
    if (code !== "0x") {
        console.log(`Contract ${contractName} already deployed at ${address}`);

        // enable this to verify the contracts on a subsequent run
        // await verifyContract(hre, {
        //     address,
        //     contract: artifact.sourceName,
        //     constructorArguments: encodedConstructorArguments,
        //     bytecode: artifact.bytecode
        // })

        return new Contract(address, artifact.abi, getWallet(hre));
    }

    return deployContract(hre, contractName, constructorArguments, {
        wallet: getWallet(hre),
        silent: false,
    }, 'create2');

}

async function deployAccountIfNotExists(initialOwner: string) {


    const salt = keccak256(initialOwner);
    const accountAddress = await factory.getAddressForSalt(salt);

    const provider = getProvider(hre);
    const code = await provider.getCode(accountAddress);
    
    if (code && code !== "0x") {
        console.log(`Account already deployed at ${accountAddress}`);
        return accountAddress;
    }

    const accountProxyArtifact = await hre.zksyncEthers.loadArtifact('AccountProxy');
    const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();
    const call: CallStruct = {
        target: ZeroAddress,
        allowFailure: false,
        value: 0,
        callData: '0x',
    };

    console.log("salt", salt);
    const initializer =
        '0xb4e581f5' +
        abiCoder
            .encode(
                [
                    'address',
                    'address',
                    'bytes[]',
                    'tuple(address target,bool allowFailure,uint256 value,bytes calldata)',
                ],
                [
                    initialOwner,
                    await eoaValidator.getAddress(),
                    [],
                    [call.target, call.allowFailure, call.value, call.callData],
                ],
            )
            .slice(2);

    const tx = await factory.deployAccount(salt, initializer);
    await tx.wait();

    await verifyContract(hre, {
        address: accountAddress,
        contract: "contracts/AccountProxy.sol:AccountProxy",
        constructorArguments: zeroPadValue(accountAddress, 32),
        bytecode: accountProxyArtifact.bytecode
    })
    console.log("Account deployed at", accountAddress)
}