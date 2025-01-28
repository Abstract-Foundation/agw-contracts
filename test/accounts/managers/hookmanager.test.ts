/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import { assert, expect } from 'chai';
import { AbiCoder, HDNodeWallet, randomBytes, solidityPackedKeccak256 } from 'ethers';
import * as hre from 'hardhat';
import { Contract } from 'zksync-ethers';
import { Provider, Wallet, utils } from 'zksync-ethers';

import { LOCAL_RICH_WALLETS, getWallet } from '../../../deploy/utils';
import { ClaveDeployer } from '../../utils/deployer';
import { fixture } from '../../utils/fixture';
import { addHook, removeHook } from '../../utils/managers/hookmanager';
import { HOOKS, VALIDATORS } from '../../utils/names';
import { ethTransfer, prepareEOATx } from '../../utils/transactions';

describe('AGW Contracts - Hook Manager tests', () => {
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

        ({ eoaValidator, account, wallet } = await fixture(
            deployer,
            VALIDATORS.EOA,
        ));

        const accountAddress = await account.getAddress();

        await deployer.fund(1000, accountAddress);
    });

    describe('Hook Manager', () => {
        it('should check existing hooks', async () => {
            expect(await account.listHooks(HOOKS.VALIDATION)).to.deep.eq([]);
            expect(await account.listHooks(HOOKS.EXECUTION)).to.deep.eq([]);
        });

        describe('Validation hooks', async () => {
            let validationHook: Contract;

            before(async () => {
                validationHook = await deployer.deployCustomContract(
                    'MockValidationHook',
                    [],
                );
            });

            it('should add a validation hook', async () => {
                expect(await account.isHook(await validationHook.getAddress()))
                    .to.be.false;

                await addHook(
                    provider,
                    account,
                    eoaValidator,
                    validationHook,
                    HOOKS.VALIDATION,
                    wallet,
                );

                expect(await account.isHook(await validationHook.getAddress()))
                    .to.be.true;

                const expectedHooks = [await validationHook.getAddress()];
                expect(await account.listHooks(HOOKS.VALIDATION)).to.deep.eq(
                    expectedHooks,
                );
            });

            it('should set hook data correctly', async () => {
                const key = randomBytes(32);
                const data = '0xc1ae';

                await validationHook.setHookData(
                    await account.getAddress(),
                    key,
                    data,
                );

                expect(
                    await account.getHookData(
                        await validationHook.getAddress(),
                        key,
                    ),
                ).to.eq(data);
            });

            it('should run validation hooks succcesfully', async () => {
                const transfer = ethTransfer(await richWallet.getAddress(), 1);

                const hookData = [
                    AbiCoder.defaultAbiCoder().encode(['bool'], [false]),
                ];

                const tx = await prepareEOATx(
                    provider,
                    account,
                    transfer,
                    await eoaValidator.getAddress(),
                    wallet,
                    hookData,
                );

                const txReceipt = await provider.broadcastTransaction(
                    utils.serializeEip712(tx),
                );
                await txReceipt.wait();
            });

            it('should remove a validation hook', async () => {
                expect(await account.isHook(await validationHook.getAddress()))
                    .to.be.true;

                const hookData = [
                    AbiCoder.defaultAbiCoder().encode(['bool'], [false]),
                ];

                await removeHook(
                    provider,
                    account,
                    eoaValidator,
                    validationHook,
                    HOOKS.VALIDATION,
                    wallet,
                    hookData,
                );
                expect(await account.isHook(await validationHook.getAddress()))
                    .to.be.false;

                expect(await account.listHooks(HOOKS.VALIDATION)).to.deep.eq(
                    [],
                );
            });
        });

        describe('Execution hooks', async () => {
            let executionHook: Contract;

            before(async () => {
                executionHook = await deployer.deployCustomContract(
                    'MockExecutionHook',
                    [],
                );
            });

            it('should add an execution hook', async () => {
                expect(await account.isHook(await executionHook.getAddress()))
                    .to.be.false;

                await addHook(
                    provider,
                    account,
                    eoaValidator,
                    executionHook,
                    HOOKS.EXECUTION,
                    wallet,
                );

                expect(await account.isHook(await executionHook.getAddress()))
                    .to.be.true;

                const expectedHooks = [await executionHook.getAddress()];
                expect(await account.listHooks(HOOKS.EXECUTION)).to.deep.eq(
                    expectedHooks,
                );
            });

            it('should remove an execution hook', async () => {
                expect(await account.isHook(await executionHook.getAddress()))
                    .to.be.true;

                await removeHook(
                    provider,
                    account,
                    eoaValidator,
                    executionHook,
                    HOOKS.EXECUTION,
                    wallet,
                );
                expect(await account.isHook(await executionHook.getAddress()))
                    .to.be.false;

                expect(await account.listHooks(HOOKS.EXECUTION)).to.deep.eq([]);
            });
        });

        describe('Common execution and validation hook tests', async () => {
            let validationHook: Contract;
            let executionHook: Contract;

            before(async () => {
                validationHook = await deployer.deployCustomContract(
                    'MockValidationHook',
                    [],
                );
                executionHook = await deployer.deployCustomContract(
                    'MockExecutionHook',
                    [],
                );
            });

            it('should revert adding a hook with unauthorized msg.sender', async () => {
                expect(await account.isHook(await validationHook.getAddress()))
                    .to.be.false;
                expect(await account.isHook(await executionHook.getAddress()))
                    .to.be.false;

                await expect(
                    account.addHook(
                        await validationHook.getAddress(),
                        HOOKS.VALIDATION,
                    ),
                ).to.be.revertedWithCustomError(
                    account,
                    'NOT_FROM_SELF_OR_MODULE',
                );

                await expect(
                    account.addHook(
                        await executionHook.getAddress(),
                        HOOKS.EXECUTION,
                    ),
                ).to.be.revertedWithCustomError(
                    account,
                    'NOT_FROM_SELF_OR_MODULE',
                );
            });

            it('should revert adding a hook with NO interface', async () => {
                const noInterfaceHook = Wallet.createRandom();
                expect(await account.isHook(await validationHook.getAddress()))
                    .to.be.false;

                try {
                    await addHook(
                        provider,
                        account,
                        eoaValidator,
                        new Contract(await noInterfaceHook.getAddress(), []),
                        HOOKS.VALIDATION,
                        wallet,
                    );
                    assert(false, 'Should revert');
                } catch (err) {}

                try {
                    await addHook(
                        provider,
                        account,
                        eoaValidator,
                        new Contract(await noInterfaceHook.getAddress(), []),
                        HOOKS.EXECUTION,
                        wallet,
                    );
                    assert(false, 'Should revert');
                } catch (err) {}
            });

            it('should revert adding a hook with invalid hookAndData length', async () => {
                const hookAndData = (await validationHook.getAddress()).slice(
                    0,
                    10,
                );
                const addHookTx = await account.addHook.populateTransaction(
                    hookAndData,
                    HOOKS.VALIDATION,
                );

                const tx = await prepareEOATx(
                    provider,
                    account,
                    addHookTx,
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

            describe('Added hooks failure tests', async () => {
                before(async () => {
                    await addHook(
                        provider,
                        account,
                        eoaValidator,
                        validationHook,
                        HOOKS.VALIDATION,
                        wallet,
                    );

                    const key = randomBytes(32);
                    const data = '0xc1ae';
                    await validationHook.setHookData(
                        await account.getAddress(),
                        key,
                        data,
                    );

                    const hookData = [
                        AbiCoder.defaultAbiCoder().encode(['bool'], [false]),
                    ];
                    await addHook(
                        provider,
                        account,
                        eoaValidator,
                        executionHook,
                        HOOKS.EXECUTION,
                        wallet,
                        hookData,
                    );
                });

                beforeEach(async () => {
                    expect(
                        await account.isHook(await validationHook.getAddress()),
                    ).to.be.true;
                    expect(
                        await account.isHook(await executionHook.getAddress()),
                    ).to.be.true;
                });

                it('should revert removing hooks with unauthorized msg.sender', async () => {
                    await expect(
                        account.removeHook(
                            await validationHook.getAddress(),
                            HOOKS.VALIDATION,
                        ),
                    ).to.be.revertedWithCustomError(
                        account,
                        'NOT_FROM_SELF_OR_MODULE',
                    );
                    await expect(
                        account.removeHook(
                            await executionHook.getAddress(),
                            HOOKS.EXECUTION,
                        ),
                    ).to.be.revertedWithCustomError(
                        account,
                        'NOT_FROM_SELF_OR_MODULE',
                    );
                });

                it('should revert when validation hooks failed', async () => {
                    const transfer = ethTransfer(
                        await richWallet.getAddress(),
                        5,
                    );
                    const hookData = [
                        AbiCoder.defaultAbiCoder().encode(['bool'], [true]),
                    ];
                    const tx = await prepareEOATx(
                        provider,
                        account,
                        transfer,
                        await eoaValidator.getAddress(),
                        wallet,
                        hookData,
                    );

                    try {
                        await provider.broadcastTransaction(
                            utils.serializeEip712(tx),
                        );
                        assert(false, 'Should revert');
                    } catch (e) {}
                });

                it('should revert when execution hooks failed', async () => {
                    const transfer = ethTransfer(
                        await richWallet.getAddress(),
                        5,
                    );
                    const hookData = [
                        AbiCoder.defaultAbiCoder().encode(['bool'], [false]),
                    ];

                    const tx = await prepareEOATx(
                        provider,
                        account,
                        transfer,
                        await eoaValidator.getAddress(),
                        wallet,
                        hookData,
                    );

                    const txReceipt = await provider.broadcastTransaction(
                        utils.serializeEip712(tx),
                    );

                    try {
                        await txReceipt.wait();
                        assert(false, 'Should revert');
                    } catch (err) {}
                });

                it('should revert setting hook data with unauthorized msg.sender, not from hooks', async function () {
                    const key = randomBytes(32);
                    const data = '0xc1ae';

                    await expect(
                        account.setHookData(key, data),
                    ).to.be.revertedWithCustomError(account, 'NOT_FROM_HOOK');
                });

                it('should revert setting hook data with invalid key', async function () {
                    const key = solidityPackedKeccak256(
                        ['string'],
                        ['HookManager.context'],
                    );
                    const data = '0xc1ae';

                    await expect(
                        validationHook.setHookData(
                            await account.getAddress(),
                            key,
                            data,
                        ),
                    ).to.be.revertedWithCustomError(account, 'INVALID_KEY');
                });
            });
        });
    });
});
