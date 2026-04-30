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
    preparePasskeyTx,
} from '../../utils/transactions';
import { addR1Validator } from '../../utils/managers/validatormanager';
import { encodePublicKey, genKey } from '../../utils/p256';
import { addR1Key } from '../../utils/managers/ownermanager';

describe('AGW Contracts - Passkey Validator tests', () => {
    let deployer: ClaveDeployer;
    let provider: Provider;
    let richWallet: Wallet;
    let passkeyValidator: Contract;
    let eoaValidator: Contract;
    let account: Contract;
    let wallet: HDNodeWallet;
    let keyPair: ec.KeyPair;

    before(async () => {
        richWallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
        deployer = new ClaveDeployer(hre, richWallet);
        provider = new Provider(hre.network.config.url, undefined, {
            cacheTimeout: -1,
        });

        ({ eoaValidator, passkeyValidator, account, wallet } = await fixture(
            deployer,
            VALIDATORS.EOA
        ));

        const accountAddress = await account.getAddress();

        await deployer.fund(1000, accountAddress);

        await addR1Validator(
            provider,
            account,
            eoaValidator,
            passkeyValidator,
            wallet,
        );

        keyPair = genKey();
        const newPublicKey = encodePublicKey(keyPair)

        await addR1Key(
            provider,
            account,
            eoaValidator,
            newPublicKey,
            wallet,
        );
    });

    describe('PasskeyValidator', () => {
        it('should check existing validator', async () => {
            const validatorAddress = await passkeyValidator.getAddress();

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
                    const tx = await preparePasskeyTx(
                        provider,
                        account,
                        txData,
                        await passkeyValidator.getAddress(),
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

                    const tx = await preparePasskeyTx(
                        provider,
                        account,
                        txData,
                        await passkeyValidator.getAddress(),
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
                        await passkeyValidator.getAddress(),
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
