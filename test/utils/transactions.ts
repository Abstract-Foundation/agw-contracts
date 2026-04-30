/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import type { ec } from 'elliptic';
import type { BigNumberish, HDNodeWallet } from 'ethers';
import { ethers, parseEther, sha256 } from 'ethers';
import type { Contract, Provider, types } from 'zksync-ethers';
import { EIP712Signer, utils } from 'zksync-ethers';

import type { CallStruct } from '../../typechain-types/contracts/batch/BatchCaller';
import { sign } from './p256';
import { getSignedData } from './passkey';

export const ethTransfer = (
    to: string,
    value: BigNumberish,
): types.TransactionLike => {
    return {
        to,
        value,
        data: '0x',
    };
};

export async function prepareMockTx(
    provider: Provider,
    account: Contract,
    tx: types.TransactionLike,
    validatorAddress: string,
    paymasterParams?: types.PaymasterParams,
): Promise<types.TransactionLike> {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const signature = abiCoder.encode(
        ['bytes', 'address', 'bytes[]'],
        ['0x' + 'C1AE'.repeat(32), validatorAddress, []],
    );

    tx = {
        ...tx,
        from: await account.getAddress(),
        nonce: await provider.getTransactionCount(await account.getAddress()),
        gasLimit: 30_000_000,
        gasPrice: await provider.getGasPrice(),
        chainId: (await provider.getNetwork()).chainId,
        type: 113,
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            customSignature: signature,
            paymasterParams: paymasterParams,
        } as types.Eip712Meta,
    };

    return tx;
}

export async function prepareMockBatchTx(
    provider: Provider,
    account: Contract,
    calls: Array<CallStruct>,
    validatorAddress: string,
    hookData: Array<ethers.BytesLike> = [],
    paymasterParams?: types.PaymasterParams,
): Promise<types.TransactionLike> {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    let totalValue: BigNumberish = BigInt(0);
    for (const call of calls) {
        totalValue += BigInt(call.value);
    }

    const accountAddress = await account.getAddress();

    const tx = {
        to: accountAddress,
        from: accountAddress,
        nonce: await provider.getTransactionCount(accountAddress),
        gasLimit: 30_000_000,
        gasPrice: await provider.getGasPrice(),
        data: account.interface.encodeFunctionData("batchCall", [calls]),
        value: totalValue,
        chainId: (await provider.getNetwork()).chainId,
        type: 113,
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams,
        } as types.Eip712Meta,
    };

    const signature = abiCoder.encode(
        ['bytes', 'address', 'bytes[]'],
        ['0x' + 'C1AE'.repeat(32), validatorAddress, hookData],
    );

    tx.customData = {
        ...tx.customData,
        customSignature: signature,
    };

    return tx;
}

export async function expectEip712TxToFail(
    provider: Provider,
    tx: types.TransactionLike,
    timeoutMs = 3_000,
): Promise<void> {
    try {
        await provider.estimateGas(tx);
    } catch {
        return;
    }

    let response;
    try {
        response = await provider.broadcastTransaction(
            utils.serializeEip712(tx),
        );
    } catch {
        return;
    }

    // Newer anvil-zksync builds can accept invalid AA txs and then never mine
    // them. Polling the receipt avoids TransactionResponse.wait() hanging.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const receipt = await provider.getTransactionReceipt(response.hash);

        if (receipt !== null) {
            if (receipt.status === 0) {
                return;
            }

            throw new Error('Expected EIP-712 transaction to fail');
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

export async function prepareTeeTx(
    provider: Provider,
    account: Contract,
    tx: types.TransactionLike,
    validatorAddress: string,
    keyPair: ec.KeyPair,
    hookData: Array<ethers.BytesLike> = [],
    paymasterParams?: types.PaymasterParams,
): Promise<types.TransactionLike> {
    if (tx.value == undefined) {
        tx.value = parseEther('0');
    }

    tx = {
        ...tx,
        from: await account.getAddress(),
        nonce: await provider.getTransactionCount(await account.getAddress()),
        gasLimit: 30_000_000,
        gasPrice: await provider.getGasPrice(),
        chainId: (await provider.getNetwork()).chainId,
        type: 113,
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams: paymasterParams,
        } as types.Eip712Meta,
    };

    const signedTxHash = EIP712Signer.getSignedDigest(tx);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    let signature = sign(sha256(signedTxHash.toString()), keyPair);

    signature = abiCoder.encode(
        ['bytes', 'address', 'bytes[]'],
        [signature, validatorAddress, hookData],
    );

    tx.customData = {
        ...tx.customData,
        customSignature: signature,
    };

    return tx;
}

export async function prepareBatchTx(
    provider: Provider,
    account: Contract,
    calls: Array<CallStruct>,
    validatorAddress: string,
    keyPair: ec.KeyPair,
    hookData: Array<ethers.BytesLike> = [],
    paymasterParams?: types.PaymasterParams,
    wallet?: HDNodeWallet,
): Promise<types.TransactionLike> {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    let totalValue: BigNumberish = 0n;
    for (const call of calls) {
        totalValue += BigInt(call.value);
    }

    const accountAddress = await account.getAddress();
    
    const tx = {
        to: accountAddress,
        from: accountAddress,
        nonce: await provider.getTransactionCount(accountAddress),
        gasLimit: 30_000_000,
        gasPrice: await provider.getGasPrice(),
        data: account.interface.encodeFunctionData("batchCall", [calls]),
        value: totalValue,
        chainId: (await provider.getNetwork()).chainId,
        type: 113,
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams,
        } as types.Eip712Meta,
    };

    const signedTxHash = EIP712Signer.getSignedDigest(tx);

    let signature: string;
    if (wallet) {
        signature = wallet.signingKey.sign(signedTxHash).serialized;
    } else {
        signature = sign(sha256(signedTxHash.toString()), keyPair);
    }

    signature = abiCoder.encode(
        ['bytes', 'address', 'bytes[]'],
        [signature, validatorAddress, hookData],
    );

    tx.customData = {
        ...tx.customData,
        customSignature: signature,
    };

    return tx;
}

export async function prepareEOATx(
    provider: Provider,
    account: Contract,
    tx: types.TransactionLike,
    validatorAddress: string,
    wallet: HDNodeWallet,
    hookData: Array<ethers.BytesLike> = [],
    paymasterParams?: types.PaymasterParams,
): Promise<types.TransactionLike> {
    if (tx.value == undefined) {
        tx.value = parseEther('0');
    }

    tx = {
        ...tx,
        from: await account.getAddress(),
        nonce: await provider.getTransactionCount(await account.getAddress()),
        gasLimit: 30_000_000,
        gasPrice: await provider.getGasPrice(),
        chainId: (await provider.getNetwork()).chainId,
        type: 113,
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams: paymasterParams,
        } as types.Eip712Meta,
    };

    const signedTxHash = EIP712Signer.getSignedDigest(tx);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    let signature = wallet.signingKey.sign(signedTxHash).serialized;

    signature = abiCoder.encode(
        ['bytes', 'address', 'bytes[]'],
        [signature, validatorAddress, hookData],
    );

    tx.customData = {
        ...tx.customData,
        customSignature: signature,
    };

    return tx;
}

export async function preparePasskeyTx(
    provider: Provider,
    account: Contract,
    tx: types.TransactionLike,
    validatorAddress: string,
    keyPair: ec.KeyPair,
    hookData: Array<ethers.BytesLike> = [],
    paymasterParams?: types.PaymasterParams,
): Promise<types.TransactionLike> {
    if (tx.value == undefined) {
        tx.value = parseEther('0');
    }

    tx = {
        ...tx,
        from: await account.getAddress(),
        nonce: await provider.getTransactionCount(await account.getAddress()),
        gasLimit: 30_000_000,
        gasPrice: await provider.getGasPrice(),
        chainId: (await provider.getNetwork()).chainId,
        type: 113,
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams: paymasterParams,
        } as types.Eip712Meta,
    };

    const signedTxHash = EIP712Signer.getSignedDigest(tx);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    let signature = sign(getSignedData(signedTxHash.toString()), keyPair);
    // Perform malleability check and invert 's' if it's too large
    const rs = signature.slice(2);
    const r = '0x' + rs.slice(0, 64);
    let s = BigInt('0x' + rs.slice(64, 128));

    // Maximum allowed value for 's' in secp256r1
    const lowSmax = BigInt(
        '0x7fffffff800000007fffffffffffffffde737d56d38bcf4279dce5617e3192a8',
    );

    if (s > lowSmax) {
        // If 's' is too large, invert it
        s =
            BigInt(
                '0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551',
            ) - s;
        // Reconstruct the signature with inverted 's'
        signature = r + s.toString(16).padStart(64, '0');
    }
    signature = '0x01' + signature.slice(2);

    signature = abiCoder.encode(
        ['bytes', 'address', 'bytes[]'],
        [signature, validatorAddress, hookData],
    );

    tx.customData = {
        ...tx.customData,
        customSignature: signature,
    };

    return tx;
}
