import {
  Disabled as DisabledEvent,
  Inited as InitedEvent,
  SessionCreated as SessionCreatedEvent,
  SessionRevoked as SessionRevokedEvent
} from "../generated/SessionKeyValidator/SessionKeyValidator"
import {
  Disabled,
  Inited,
  SessionCreated,
  SessionRevoked
} from "../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"

export function handleDisabled(event: DisabledEvent): void {
  let entity = new Disabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInited(event: InitedEvent): void {
  let entity = new Inited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSessionCreated(event: SessionCreatedEvent): void {
  let entity = new SessionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.sessionHash = event.params.sessionHash
  entity.sessionSpec_signer = event.params.sessionSpec.signer
  entity.sessionSpec_expiresAt = event.params.sessionSpec.expiresAt
  entity.sessionSpec_feeLimit_limitType =
    event.params.sessionSpec.feeLimit.limitType
  entity.sessionSpec_feeLimit_limit = event.params.sessionSpec.feeLimit.limit
  entity.sessionSpec_feeLimit_period = event.params.sessionSpec.feeLimit.period
  entity.sessionSpec_callPolicies = changetype<Bytes[]>(
    event.params.sessionSpec.callPolicies
  )
  entity.sessionSpec_transferPolicies = changetype<Bytes[]>(
    event.params.sessionSpec.transferPolicies
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSessionRevoked(event: SessionRevokedEvent): void {
  let entity = new SessionRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.sessionHash = event.params.sessionHash

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
