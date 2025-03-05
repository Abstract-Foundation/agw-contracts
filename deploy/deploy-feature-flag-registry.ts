/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import * as hre from 'hardhat';
import { Wallet } from 'zksync-ethers';
import { create2IfNotExists, getWallet } from '../deploy/utils';
let fundingWallet: Wallet;

// An example of a basic deploy script
// Do not push modifications to this file
// Just modify, interact then revert changes
export default async function (): Promise<void> {
    fundingWallet = getWallet(hre);

    const initialOwner = fundingWallet.address;

    const implementation = await create2IfNotExists(hre, "FeatureFlagRegistry", [initialOwner]);

    console.log("FeatureFlagRegistry deployed at", await implementation.getAddress());
}

