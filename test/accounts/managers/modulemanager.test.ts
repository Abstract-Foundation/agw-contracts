/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import { assert, expect } from 'chai';
import type { ec } from 'elliptic';
import { AbiCoder, concat, HDNodeWallet, parseEther } from 'ethers';
import * as hre from 'hardhat';
import { Contract, Provider, Wallet, utils } from 'zksync-ethers';

import { LOCAL_RICH_WALLETS, getWallet } from '../../../deploy/utils';
import { ClaveDeployer } from '../../utils/deployer';
import { fixture } from '../../utils/fixture';
import { addModule, removeModule } from '../../utils/managers/modulemanager';
import { VALIDATORS } from '../../utils/names';
import { prepareEOATx } from '../../utils/transactions';

describe('AGW Contracts - Module Manager tests', () => {
    let deployer: ClaveDeployer;
    let provider: Provider;
    let richWallet: Wallet;
    let eoaValidator: Contract;
    let account: Contract;
    let wallet: HDNodeWallet;

    before(async () => {
        richWallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
        deployer = new ClaveDeployer(hre, richWallet);
        provider = new Provider(hre.network.config.url, undefined, {
            cacheTimeout: -1,
        });

        ({eoaValidator, account, wallet} = await fixture(
            deployer,
            VALIDATORS.EOA,
        ));

        const accountAddress = await account.getAddress();

        await deployer.fund(1000, accountAddress);
    });

    describe('Module Manager', () => {
        let mockModule: Contract;

        describe('Main module functionalities', () => {
            it('should check existing modules', async () => {
                expect(await account.listModules()).to.deep.eq([]);
            });

            it('should add a new module', async () => {
                mockModule = await deployer.deployCustomContract(
                    'MockModule',
                    [],
                );
                expect(await account.isModule(await mockModule.getAddress())).to
                    .be.false;

                const initData = AbiCoder.defaultAbiCoder().encode(
                    ['uint256'],
                    [parseEther('42')],
                );
                await addModule(
                    provider,
                    account,
                    eoaValidator,
                    mockModule,
                    initData,
                    wallet,
                );
                expect(await account.isModule(await mockModule.getAddress())).to
                    .be.true;

                const expectedModules = [await mockModule.getAddress()];
                expect(await account.listModules()).to.deep.eq(expectedModules);
            });

            it('should execute from a module', async () => {
                const amount = parseEther('42');
                const delta = parseEther('0.01');

                const accountBalanceBefore = await provider.getBalance(
                    await account.getAddress(),
                );
                const receiverBalanceBefore = await provider.getBalance(
                    await richWallet.getAddress(),
                );

                await mockModule.mockExecuteFromModule(
                    await account.getAddress(),
                    await richWallet.getAddress(),
                );

                const accountBalanceAfter = await provider.getBalance(
                    await account.getAddress(),
                );
                const receiverBalanceAfter = await provider.getBalance(
                    await richWallet.getAddress(),
                );

                expect(accountBalanceAfter).to.be.closeTo(
                    accountBalanceBefore - amount,
                    delta,
                );
                expect(receiverBalanceAfter).to.be.closeTo(
                    receiverBalanceBefore + amount,
                    delta,
                );
            });

            it('should remove a module', async () => {
                expect(await account.isModule(await mockModule.getAddress())).to
                    .be.true;

                await removeModule(
                    provider,
                    account,
                    eoaValidator,
                    mockModule,
                    wallet,
                );

                expect(await account.isModule(await mockModule.getAddress())).to
                    .be.false;
                const expectedModules: Array<string> = [];
                expect(await account.listModules()).to.deep.eq(expectedModules);
            });
        });

        describe('Alternative module cases', () => {
            let newMockModule: Contract;

            before(async () => {
                newMockModule = await deployer.deployCustomContract(
                    'MockModule',
                    [],
                );
            });

            it('should revert adding module with unauthorized msg.sender', async () => {
                const initData = AbiCoder.defaultAbiCoder().encode(
                    ['uint256'],
                    [parseEther('42')],
                );
                const moduleAndData = concat([
                    await newMockModule.getAddress(),
                    initData,
                ]);

                await expect(
                    account.addModule(moduleAndData),
                ).to.be.revertedWithCustomError(
                    account,
                    'NOT_FROM_SELF_OR_MODULE',
                );
            });

            it('should revert removing module with unauthorized msg.sender', async () => {
                const initData = AbiCoder.defaultAbiCoder().encode(
                    ['uint256'],
                    [parseEther('42')],
                );
                await addModule(
                    provider,
                    account,
                    eoaValidator,
                    newMockModule,
                    initData,
                    wallet,
                );
                expect(await account.isModule(await newMockModule.getAddress()))
                    .to.be.true;

                await expect(
                    account.removeModule(await newMockModule.getAddress()),
                ).to.be.revertedWithCustomError(
                    account,
                    'NOT_FROM_SELF_OR_MODULE',
                );
            });

            it('should revert adding module invalid moduleAndData length', async () => {
                const moduleAndData = (await mockModule.getAddress()).slice(
                    0,
                    10,
                );
                const addModuleTx = await account.addModule.populateTransaction(
                    moduleAndData,
                );
                const tx = await prepareEOATx(
                    provider,
                    account,
                    addModuleTx,
                    await eoaValidator.getAddress(),
                    wallet,
                );

                const txReceipt = await provider.broadcastTransaction(
                    utils.serializeEip712(tx),
                );
                try {
                    await txReceipt.wait();
                    assert(false, 'Should revert');
                } catch (err) {}
            });

            it('should revert adding module with no interface', async () => {
                const noInterfaceModule = Wallet.createRandom();
                const initData = AbiCoder.defaultAbiCoder().encode(
                    ['uint256'],
                    [parseEther('42')],
                );

                try {
                    await addModule(
                        provider,
                        account,
                        eoaValidator,
                        new Contract(await noInterfaceModule.getAddress(), []),
                        initData,
                        wallet,
                    );
                    assert(false, 'Should revert');
                } catch (err) {}
            });
        });
    });
});
