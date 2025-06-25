/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import * as hre from 'hardhat';
import { Wallet } from 'zksync-ethers';
import { create2IfNotExists, getProvider, getWallet } from '../deploy/utils';
let fundingWallet: Wallet;

export default async function (): Promise<void> {
    fundingWallet = getWallet(hre);

    const provider = getProvider(hre);

    const network = await provider.getNetwork();

    const implementation = await create2IfNotExists(hre, "ChainOpsPaymaster", [
        "0x6f6426a9b93a7567fCCcBfE5d0d6F26c1085999b", 
        "0x9B947df68D35281C972511B3E7BC875926f26C1A"
    ]);

    await implementation.setSponsoredAccount("0x6f6426a9b93a7567fCCcBfE5d0d6F26c1085999b", true);
    if (network.chainId === 2741n) {
        await implementation.setSponsoredAccount("0x7f60048318AD245B29A2cE9E87733C22d1f8335E", true);
    } else if (network.chainId === 11124n) {
        await implementation.setSponsoredAccount("0x84ffdFA5737012752AA9bfc89C6865E22a40c446", true);
    }
}
