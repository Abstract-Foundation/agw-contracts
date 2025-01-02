/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import { expect } from 'chai';
import type { ec } from 'elliptic';
import type { BytesLike, HDNodeWallet } from 'ethers';
import { getAddress, hexlify, parseEther, randomBytes } from 'ethers';
import * as hre from 'hardhat';
import type { Contract, Wallet } from 'zksync-ethers';
import { Provider } from 'zksync-ethers';

import { LOCAL_RICH_WALLETS, getWallet } from '../../deploy/utils';
import { ClaveDeployer } from '../utils/deployer';
import { fixture } from '../utils/fixture';
import { VALIDATORS } from '../utils/names';

describe('AGW Contracts - Deployer class tests', () => {
    let deployer: ClaveDeployer;
    let provider: Provider;
    let richWallet: Wallet;
    let registry: Contract;
    let implementation: Contract;
    let factory: Contract;
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

        ({
            registry,
            implementation,
            factory,
            eoaValidator,
            account,
            wallet,
            keyPair,
        } = await fixture(deployer, VALIDATORS.EOA));

        await deployer.fund(100, await account.getAddress());
    });

    describe('Contracts', () => {
        it('should deploy the contracts', async () => {
            expect(await registry.getAddress()).not.to.be.undefined;
            expect(await implementation.getAddress()).not.to.be.undefined;
            expect(await factory.getAddress()).not.to.be.undefined;
            expect(await eoaValidator.getAddress()).not.to.be.undefined;
            expect(await account.getAddress()).not.to.be.undefined;
        });
    });

    describe('States', () => {
        it('should fund the account', async () => {
            const balance = await provider.getBalance(
                await account.getAddress(),
            );
            expect(balance).to.eq(parseEther('100'));
        });

        it('account keeps correct states', async () => {
            const validatorAddress = await eoaValidator.getAddress();
            const implementationAddress = await implementation.getAddress();

            const expectedR1Validators: Array<BytesLike> = [];
            const expectedK1Validators: Array<BytesLike> = [validatorAddress];
            const expectedR1Owners: Array<BytesLike> = [];
            const expectedK1Owners: Array<BytesLike> = [wallet.address];
            const expectedModules: Array<BytesLike> = [];
            const expectedHooks: Array<BytesLike> = [];
            const expectedImplementation = implementationAddress;

            expect(await account.r1ListValidators()).to.deep.eq(
                expectedR1Validators,
            );
            expect(await account.k1ListValidators()).to.deep.eq(
                expectedK1Validators,
            );
            expect(await account.r1ListOwners()).to.deep.eq(expectedR1Owners);
            expect(await account.k1ListOwners()).to.deep.eq(expectedK1Owners);
            expect(await account.listModules()).to.deep.eq(expectedModules);
            expect(await account.listHooks(false)).to.deep.eq(expectedHooks);
            expect(await account.listHooks(true)).to.deep.eq(expectedHooks);
            expect(await account.implementationAddress()).to.eq(
                expectedImplementation,
            );
        });

        it('registry is deployed and states are expected', async function () {
            const accountAddress = await account.getAddress();
            const factoryAddress = await factory.getAddress();

            expect(await registry.isAGW(accountAddress)).to.be.true;
            expect(await registry.isAGW(factoryAddress)).not.to.be.true;
        });

        it('should not deploy an account with an invalid salt', async () => {
            const salt = randomBytes(32);
            await expect(deployer.account(wallet, factory, eoaValidator, { salt: hexlify(salt) }))
                .to.be.revertedWithCustomError(account, "INVALID_SALT");
        });

        it('should not deploy an account with an empty initializer', async () => {
            await expect(deployer.account(wallet, factory, eoaValidator, { initializer: '0x' }))
            .to.be.revertedWithCustomError(factory, "INVALID_INITIALIZER");
        });

        it('should not deploy an account with an invalid initializer selector', async () => {
            await expect(deployer.account(wallet, factory, eoaValidator, { initializer: '0xabababab' }))
            .to.be.revertedWithCustomError(factory, "INVALID_INITIALIZER");
        });

        it('should deploy an account with a payable initial call', async () => {
            const target = getAddress('0x0000000000000000000000000000000000abcdef');
            const initialCall = {
                target,
                allowFailure: false,
                value: parseEther('0.9'),
                callData: '0x',
            };
            const otherWallet = getWallet(hre, LOCAL_RICH_WALLETS[1].privateKey);
            const newAccount = await deployer.account(otherWallet, factory, eoaValidator, { 
                initialCall, 
                callValue: parseEther('1') 
            });

            expect(await provider.getBalance(target)).to.eq(parseEther('0.9'));
            expect(await provider.getBalance(await newAccount.getAddress())).to.eq(parseEther('0.1'));

        });
    });
});
