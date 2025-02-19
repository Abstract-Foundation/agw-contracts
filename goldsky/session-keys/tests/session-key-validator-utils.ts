import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  Disabled,
  Inited,
  SessionCreated,
  SessionRevoked
} from "../generated/SessionKeyValidator/SessionKeyValidator"

export function createDisabledEvent(account: Address): Disabled {
  let disabledEvent = changetype<Disabled>(newMockEvent())

  disabledEvent.parameters = new Array()

  disabledEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return disabledEvent
}

export function createInitedEvent(account: Address): Inited {
  let initedEvent = changetype<Inited>(newMockEvent())

  initedEvent.parameters = new Array()

  initedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return initedEvent
}

export function createSessionCreatedEvent(
  account: Address,
  sessionHash: Bytes,
  sessionSpec: ethereum.Tuple
): SessionCreated {
  let sessionCreatedEvent = changetype<SessionCreated>(newMockEvent())

  sessionCreatedEvent.parameters = new Array()

  sessionCreatedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  sessionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "sessionHash",
      ethereum.Value.fromFixedBytes(sessionHash)
    )
  )
  sessionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "sessionSpec",
      ethereum.Value.fromTuple(sessionSpec)
    )
  )

  return sessionCreatedEvent
}

export function createSessionRevokedEvent(
  account: Address,
  sessionHash: Bytes
): SessionRevoked {
  let sessionRevokedEvent = changetype<SessionRevoked>(newMockEvent())

  sessionRevokedEvent.parameters = new Array()

  sessionRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  sessionRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "sessionHash",
      ethereum.Value.fromFixedBytes(sessionHash)
    )
  )

  return sessionRevokedEvent
}
