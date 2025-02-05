import {
  Disabled as DisabledEvent,
  Inited as InitedEvent,
  SessionCreated as SessionCreatedEvent,
  SessionRevoked as SessionRevokedEvent
} from "../generated/SessionKeyValidator/SessionKeyValidator"
import {
  CallSpec,
  Constraint,
  Disabled,
  Inited,
  SessionCreated,
  SessionRevoked,
  SessionSpec,
  TransferSpec,
  UsageLimit
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

  let sessionSpec = new SessionSpec(event.params.sessionHash.concatI32(event.block.number.toI32()).concatI32(event.logIndex.toI32()));
  sessionSpec.signer = event.params.sessionSpec.signer
  sessionSpec.expiresAt = event.params.sessionSpec.expiresAt

  let feeLimit = new UsageLimit(sessionSpec.id);
  feeLimit.limitType = event.params.sessionSpec.feeLimit.limitType
  feeLimit.limit = event.params.sessionSpec.feeLimit.limit
  feeLimit.period = event.params.sessionSpec.feeLimit.period
  feeLimit.save()

  sessionSpec.feeLimit = feeLimit.id
  
  let callPolicies: Bytes[] = []
  let transferPolicies: Bytes[] = []

  for (let i = 0; i < event.params.sessionSpec.callPolicies.length; i++) {
    let constraints: Bytes[] = []
    let callPolicy = new CallSpec(sessionSpec.id.concatI32(i));
    callPolicy.target = event.params.sessionSpec.callPolicies[i].target
    callPolicy.selector = event.params.sessionSpec.callPolicies[i].selector
    callPolicy.maxValuePerUse = event.params.sessionSpec.callPolicies[i].maxValuePerUse
    for (let j = 0; j < event.params.sessionSpec.callPolicies[i].constraints.length; j++) {
      let constraint = new Constraint(callPolicy.id.concatI32(j));
      constraint.condition = event.params.sessionSpec.callPolicies[i].constraints[j].condition
      constraint.index = event.params.sessionSpec.callPolicies[i].constraints[j].index
      constraint.refValue = event.params.sessionSpec.callPolicies[i].constraints[j].refValue
      constraint.save()
      constraints.push(constraint.id)
    }
    callPolicy.constraints = constraints
    let valueLimit = new UsageLimit(Bytes.fromUTF8("callPolicy").concat(callPolicy.id));  
    valueLimit.limitType = event.params.sessionSpec.callPolicies[i].valueLimit.limitType
    valueLimit.limit = event.params.sessionSpec.callPolicies[i].valueLimit.limit
    valueLimit.period = event.params.sessionSpec.callPolicies[i].valueLimit.period
    valueLimit.save()
    callPolicy.valueLimit = valueLimit.id
    callPolicy.save()
    callPolicies.push(callPolicy.id)
  }
  sessionSpec.callPolicies = callPolicies
  
  for (let i = 0; i < event.params.sessionSpec.transferPolicies.length; i++) {
    let transferPolicy = new TransferSpec(sessionSpec.id.concatI32(i));
    transferPolicy.target = event.params.sessionSpec.transferPolicies[i].target
    transferPolicy.maxValuePerUse = event.params.sessionSpec.transferPolicies[i].maxValuePerUse
    let valueLimit = new UsageLimit(Bytes.fromUTF8("transferPolicy").concat(transferPolicy.id));  
    valueLimit.limitType = event.params.sessionSpec.transferPolicies[i].valueLimit.limitType
    valueLimit.limit = event.params.sessionSpec.transferPolicies[i].valueLimit.limit
    valueLimit.period = event.params.sessionSpec.transferPolicies[i].valueLimit.period
    valueLimit.save()
    transferPolicy.valueLimit = valueLimit.id
    transferPolicy.save()
    transferPolicies.push(transferPolicy.id)
  }
  sessionSpec.transferPolicies = transferPolicies
  sessionSpec.save()

  let entity = new SessionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.sessionHash = event.params.sessionHash
  entity.sessionSpec = sessionSpec.id
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
