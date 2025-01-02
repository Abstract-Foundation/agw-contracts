/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import {
    keccak256,
    ZeroAddress,
    zeroPadValue
} from 'ethers';
import * as hre from 'hardhat';
import { Contract, Wallet, utils } from 'zksync-ethers';
import { deployContract, getWallet, verifyContract } from '../deploy/utils';
import type { CallStruct } from '../typechain-types/contracts/batch/BatchCaller';
let fundingWallet: Wallet;

let batchCaller: Contract;
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

    const eoaValidatorAddress = "0x1af85E1C3501B66987689A5684bE20da2443fB44";

    implementation = await deployContract(
        hre,
        'AGWAccount',
        [await eoaValidator.getAddress()],
        {
            wallet: fundingWallet,
            silent: false,
        },
        'create2',
    );

    registry = await deployContract(hre, 'AGWRegistry',
        [
            initialOwner,
        ], {
        wallet: fundingWallet,
        silent: false,
    }, 'create2');

    // Need this so the ClaveProxy artifact is valid
    await deployContract(
        hre,
        'AccountProxy',
        [await implementation.getAddress()],
        { wallet: fundingWallet, silent: true, noVerify: true },
        'create2',
    );

    const accountProxyArtifact = await hre.zksyncEthers.loadArtifact('AccountProxy');
    const bytecodeHash = utils.hashBytecode(accountProxyArtifact.bytecode);
    factory = await deployContract(
        hre,
        'AccountFactory',
        [
            await implementation.getAddress(),
            "0xb4e581f5",
            await registry.getAddress(),
            bytecodeHash,
            fundingWallet.address,
            initialOwner,
        ],
        {
            wallet: fundingWallet,
            silent: false,
        },
        'create2',
    );
    await registry.setFactory(await factory.getAddress());

    const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();
    const call: CallStruct = {
        target: ZeroAddress,
        allowFailure: false,
        value: 0,
        callData: '0x',
    };

    const salt = keccak256(initialOwner.padEnd(66, '0'));
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
                    eoaValidatorAddress,
                    [],
                    [call.target, call.allowFailure, call.value, call.callData],
                ],
            )
            .slice(2);

    const tx = await factory.deployAccount(salt, initializer);
    await tx.wait();

    const accountAddress = await factory.getAddressForSalt(salt);

    await verifyContract(hre, {
        address: accountAddress,
        contract: "contracts/AccountProxy.sol:AccountProxy",
        constructorArguments: zeroPadValue(accountAddress, 32),
        bytecode: accountProxyArtifact.bytecode
    })
    console.log("accountAddress", accountAddress)
}
