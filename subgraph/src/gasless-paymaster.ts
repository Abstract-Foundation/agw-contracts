/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */

/* eslint-disable @typescript-eslint/consistent-type-imports */
import { BigInt, Bytes } from '@graphprotocol/graph-ts';

import { FeeSponsored as FeeSponsoredEvent } from '../generated/GaslessPaymaster/GaslessPaymaster';
import { ClaveAccount, ClaveTransaction } from '../generated/schema';
import { getOrCreateWeek, getOrCreateWeekAccount } from './helpers';

export function handleFeeSponsored(event: FeeSponsoredEvent): void {
    const transaction = new ClaveTransaction(event.transaction.hash);
    const week = getOrCreateWeek(event.block.timestamp);
    const account = ClaveAccount.load(event.params.user);
    if (account != null) {
        const weekAccount = getOrCreateWeekAccount(account, week);
        weekAccount.save();

        week.transactions = week.transactions + 1;
        transaction.sender = event.transaction.from;

        if (event.transaction.to != null) {
            transaction.to = event.transaction.to;
        } else {
            transaction.to = Bytes.fromHexString('0x');
        }
        transaction.value = event.transaction.value;
        let gasUsed = BigInt.fromI32(0);
        const receipt = event.receipt;
        if (receipt != null) {
            gasUsed = receipt.gasUsed;
        }
        transaction.gasCost = event.transaction.gasPrice.times(gasUsed);
        transaction.paymaster = 'Gasless';
        transaction.date = event.block.timestamp;
    }

    week.save();
    transaction.save();
}
