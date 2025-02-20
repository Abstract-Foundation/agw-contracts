/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import {
    AbiCoder,
    ZeroHash,
} from 'ethers';
import * as hre from 'hardhat';
import { Contract, Wallet, utils } from 'zksync-ethers';
import { deployContract, getProvider, getWallet } from '../deploy/utils';
let fundingWallet: Wallet;

// An example of a basic deploy script
// Do not push modifications to this file
// Just modify, interact then revert changes
export default async function (): Promise<void> {
    fundingWallet = getWallet(hre);

    const initialOwner = fundingWallet.address;

    const implementation = await create2IfNotExists("SessionKeyPolicyRegistry", []);

    await create2IfNotExists("ERC1967Proxy", [
        await implementation.getAddress(), 
        implementation.interface.encodeFunctionData("initialize", [initialOwner])
    ]);
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