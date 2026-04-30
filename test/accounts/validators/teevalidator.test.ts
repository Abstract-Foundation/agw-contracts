/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import { assert, expect } from 'chai';
import type { ec } from 'elliptic';
import { HDNodeWallet, parseEther } from 'ethers';
import * as hre from 'hardhat';
import { Provider, Wallet, utils } from 'zksync-ethers';
import type { Contract } from 'zksync-ethers';
import type { TransactionLike } from 'zksync-ethers/build/types';

import { LOCAL_RICH_WALLETS, getWallet } from '../../../deploy/utils';
import { ClaveDeployer } from '../../utils/deployer';
import { fixture } from '../../utils/fixture';
import { VALIDATORS } from '../../utils/names';
import {
    ethTransfer,
    expectEip712TxToFail,
    prepareMockTx,
    prepareTeeTx,
} from '../../utils/transactions';
import { addR1Validator } from '../../utils/managers/validatormanager';
import { encodePublicKey } from '../../utils/p256';
import { addR1Key } from '../../utils/managers/ownermanager';

describe('AGW Contracts - TEE Validator tests', () => {
    let deployer: ClaveDeployer;
    let provider: Provider;
    let richWallet: Wallet;
    let eoaValidator: Contract;
    let teeValidator: Contract;
    let account: Contract;
    let wallet: HDNodeWallet;
    let keyPair: ec.KeyPair;

    before(async () => {
        richWallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
        deployer = new ClaveDeployer(hre, richWallet);
        provider = new Provider(hre.network.config.url, undefined, {
            cacheTimeout: -1,
        });

        ({ teeValidator, eoaValidator, account, wallet, keyPair } = await fixture(
            deployer,
            VALIDATORS.EOA,
        ));

        const accountAddress = await account.getAddress();

        await deployer.fund(100, accountAddress);

        await addR1Validator(
            provider,
            account,
            eoaValidator,
            teeValidator,
            wallet,
        );

        await addR1Key(
            provider,
            account,
            eoaValidator,
            encodePublicKey(keyPair),
            wallet,
        );
    });

    describe('TEEValidator', () => {
        it('should check existing validator', async () => {
            const validatorAddress = await teeValidator.getAddress();

            expect(await account.r1IsValidator(validatorAddress)).to.be.true;
        });

        describe('Signature checks', () => {
            let richAddress: string;
            let richBalanceBefore: bigint;
            let amount: bigint;

            let txData: TransactionLike;

            beforeEach(async () => {
                richBalanceBefore = await provider.getBalance(richAddress);
            });

            before(async () => {
                richAddress = await richWallet.getAddress();

                amount = parseEther('1');

                txData = ethTransfer(richAddress, amount);
            });

            describe('Valid tx and signature', () => {
                it('should send a tx', async () => {
                    const tx = await prepareTeeTx(
                        provider,
                        account,
                        txData,
                        await teeValidator.getAddress(),
                        keyPair,
                    );
                    const txReceipt = await provider.broadcastTransaction(
                        utils.serializeEip712(tx),
                    );
                    await txReceipt.wait();

                    const richBalanceAfter = await provider.getBalance(
                        richAddress,
                    );
                    expect(richBalanceAfter).to.eq(richBalanceBefore + amount);
                });
            });

            describe('Invalid tx and signature', () => {
                it('should revert sending the tx', async () => {
                    const mockTxData = txData;
                    mockTxData.to = await Wallet.createRandom().getAddress(); // corrupted tx data

                    const tx = await prepareTeeTx(
                        provider,
                        account,
                        txData,
                        await teeValidator.getAddress(),
                        keyPair,
                    );

                    try {
                        const txReceipt = await provider.broadcastTransaction(
                            utils.serializeEip712(tx),
                        );
                        await txReceipt.wait();
                        assert(false);
                    } catch (err) {}

                    const richBalanceAfter = await provider.getBalance(
                        richAddress,
                    );
                    expect(richBalanceAfter).to.eq(richBalanceBefore);
                });
            });

            describe('Tx and wrong signature', () => {
                it('should revert sending the tx', async () => {
                    const tx = await prepareMockTx(
                        provider,
                        account,
                        txData,
                        await teeValidator.getAddress(),
                    );

                    await expectEip712TxToFail(provider, tx);

                    const richBalanceAfter = await provider.getBalance(
                        richAddress,
                    );
                    expect(richBalanceAfter).to.eq(richBalanceBefore);
                });
            });
        });
    });
});
