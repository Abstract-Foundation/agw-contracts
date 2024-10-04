/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import { expect } from 'chai';
import type { ec } from 'elliptic';
import { AbiCoder } from 'ethers';
import * as hre from 'hardhat';
import type { Contract } from 'zksync-ethers';
import { Provider, Wallet } from 'zksync-ethers';

import { LOCAL_RICH_WALLETS, getWallet } from '../../../deploy/utils';
import { ClaveDeployer } from '../../utils/deployer';
import { fixture } from '../../utils/fixture';
import { addModule } from '../../utils/managers/modulemanager';
import { VALIDATORS } from '../../utils/names';
import { genKey } from '../../utils/p256';
import { updateSocialRecoveryConfig } from '../../utils/recovery/recovery';

describe('Clave Contracts - Manager tests', () => {
    let deployer: ClaveDeployer;
    let provider: Provider;
    let richWallet: Wallet;
    let teeValidator: Contract;
    let account: Contract;
    let keyPair: ec.KeyPair;

    let socialRecoveryModule: Contract;

    before(async () => {
        richWallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
        deployer = new ClaveDeployer(hre, richWallet);
        provider = new Provider(hre.network.config.url, undefined, {
            cacheTimeout: -1,
        });

        [, , , , teeValidator, account, keyPair] = await fixture(
            deployer,
            VALIDATORS.TEE,
        );

        const accountAddress = await account.getAddress();

        await deployer.fund(10000, accountAddress);

        socialRecoveryModule = await deployer.deployCustomContract(
            'SocialRecoveryModule',
            ['TEST', '0', 0, 0],
        );
    });

    describe('Module Tests - Social Recovery Module', () => {
        let socialGuardian: Wallet;
        let secondGuardian: Wallet;
        let newKeyPair: ec.KeyPair;

        describe('Adding & Initializing module', () => {
            before(async () => {
                socialGuardian = new Wallet(
                    Wallet.createRandom().privateKey,
                    provider,
                );
                secondGuardian = new Wallet(
                    Wallet.createRandom().privateKey,
                    provider,
                );

                newKeyPair = genKey();
            });

            it('should check existing modules', async () => {
                expect(await account.listModules()).to.deep.eq([]);
            });

            it('should add a new module', async () => {
                expect(
                    await account.isModule(
                        await socialRecoveryModule.getAddress(),
                    ),
                ).to.be.false;

                const initData = AbiCoder.defaultAbiCoder().encode(
                    ['tuple(uint128, uint128, address[])'],
                    [[1, 1, [await socialGuardian.getAddress()]]],
                );
                await addModule(
                    provider,
                    account,
                    teeValidator,
                    socialRecoveryModule,
                    initData,
                    keyPair,
                );
                expect(
                    await account.isModule(
                        await socialRecoveryModule.getAddress(),
                    ),
                ).to.be.true;

                const expectedModules = [
                    await socialRecoveryModule.getAddress(),
                ];
                expect(await account.listModules()).to.deep.eq(expectedModules);
            });

            it('should init the module successfully', async () => {
                const status = await socialRecoveryModule.isInited(
                    await account.getAddress(),
                );
                expect(status).to.eq(true);
            });

            it('should assign the guardian correctly', async () => {
                const guardians = await socialRecoveryModule.getGuardians(
                    await account.getAddress(),
                );
                expect(guardians).to.deep.eq([
                    await socialGuardian.getAddress(),
                ]);
            });

            it('should change the guardian correctly', async () => {
                await updateSocialRecoveryConfig(
                    provider,
                    account,
                    socialRecoveryModule,
                    teeValidator,
                    [1, 1, [await secondGuardian.getAddress()]],
                    keyPair,
                );

                const guardians = await socialRecoveryModule.getGuardians(
                    await account.getAddress(),
                );
                expect(guardians).to.deep.eq([
                    await secondGuardian.getAddress(),
                ]);
            });

            it('should add multiple guardians correctly', async () => {
                await updateSocialRecoveryConfig(
                    provider,
                    account,
                    socialRecoveryModule,
                    teeValidator,
                    [
                        1,
                        1,
                        [
                            await socialGuardian.getAddress(),
                            await secondGuardian.getAddress(),
                        ],
                    ],
                    keyPair,
                );

                const guardians = await socialRecoveryModule.getGuardians(
                    await account.getAddress(),
                );
                expect(guardians).to.deep.eq([
                    await socialGuardian.getAddress(),
                    await secondGuardian.getAddress(),
                ]);
            });
        });
    });
});
