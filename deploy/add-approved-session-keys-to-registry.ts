/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import * as hre from "hardhat";
import { Contract, utils } from "zksync-ethers";
import { ZeroHash } from "ethers";
import { getWallet } from "../deploy/utils";

enum PolicyType {
  Call = 0,
  Transfer = 1,
  ApprovalTarget = 2,
}

enum Status {
  Unset = 0,
  Allowed = 1,
  Blocked = 2,
}

const sessionKeysToApprove: any[] = [
  // Call policies for various contracts
  // From the first sample config
  {
    type: PolicyType.Call,
    target: "0xF99E6e273a90Fac72F3692B033A46e8b602DC44e",
    selector: "0x42966c68", // burnAndMint selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x57E12aBdF617FcD0D2ab6984C289075aA90CAc8C",
    selector: "0xa22cb465", // setApprovalForAll selector
    status: Status.Allowed,
  },
  // From the second sample config
  {
    type: PolicyType.Call,
    target: "0xe88ba37DE1F9d88989ae079AB6876F917EF64f3d",
    selector: "0x3beba5c7",
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0xe88ba37DE1F9d88989ae079AB6876F917EF64f3d",
    selector: "0x00f041ef",
    status: Status.Allowed,
  },
  // From the third sample config
  {
    type: PolicyType.Call,
    target: "0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1",
    selector: "0x095ea7b3", // approve selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xb1a1a882", // depositETH selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0x47e7ef24", // deposit selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0x4782f779", // withdrawETH selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0x69328dec", // withdraw selector
    status: Status.Allowed,
  },
  // From the fourth sample config
  {
    type: PolicyType.Call,
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    selector: "0xe4849b32", // sell selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    selector: "0xd6bbd32d", // buy selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    selector: "0x4f1ddc4f", // claimWinnings selector
    status: Status.Allowed,
  },
  // Approval targets from the fourth sample config
  {
    type: PolicyType.ApprovalTarget,
    token: "0xf19609e96187cdaa34cffb96473fac567e547302", // PTS
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    status: Status.Allowed,
  },
  {
    type: PolicyType.ApprovalTarget,
    token: "0x9ebe3a824ca958e4b3da772d2065518f009cba62", // PENGU
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    status: Status.Allowed,
  },
  {
    type: PolicyType.ApprovalTarget,
    token: "0x84a71ccd554cc1b02749b35d22f684cc8ec987e1", // USDC
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    status: Status.Allowed,
  },
  // From the fifth sample config
  {
    type: PolicyType.Call,
    target: "0x42b2c802205b908030Bc374c1D30Cc4997FC199a",
    selector: "0xf088d547", // buy selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x42b2c802205b908030Bc374c1D30Cc4997FC199a",
    selector: "0xe65e7daf", // sell selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x42b2c802205b908030Bc374c1D30Cc4997FC199a",
    selector: "0x2a1b1f7f", // deployToken selector
    status: Status.Allowed,
  },
  // From the sixth sample config
  {
    type: PolicyType.Call,
    target: "0x3439153EB7AF838Ad19d56E1571FBD09333C2809",
    selector: "0x2e1a7d4d", // withdraw selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x3272596F776470D2D7C3f7dfF3dc50888b7D8967",
    selector: "0x8f5d96d0", // purchaseETH selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x3272596F776470D2D7C3f7dfF3dc50888b7D8967",
    selector: "0x4e71d92d", // claim selector
    status: Status.Allowed,
  },
  // From the seventh sample config
  {
    type: PolicyType.Call,
    target: "0xA27f718c7fB6e5f1eaEb894597143B6b880a3ae9",
    selector: "0x9b2c0a37", // requestTokenSpin selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.ApprovalTarget,
    token: "0x9ebe3a824ca958e4b3da772d2065518f009cba62", // PENGU
    target: "0xA27f718c7fB6e5f1eaEb894597143B6b880a3ae9",
    status: Status.Allowed,
  },
];

export default async function (): Promise<void> {
  // Get the wallet for signing transactions
  const wallet = getWallet(hre);

  // Get the registry contract address
  // This assumes the registry was deployed using create2 with the same parameters as in deploy-session-key-registry.ts
  const artifact = await hre.zksyncEthers.loadArtifact(
    "SessionKeyPolicyRegistry"
  );
  const bytecodeHash = utils.hashBytecode(artifact.bytecode);
  const implementationAddress = utils.create2Address(
    "0x0000000000000000000000000000000000010000",
    bytecodeHash,
    ZeroHash,
    "0x"
  );

  // Get the proxy artifact
  const proxyArtifact = await hre.zksyncEthers.loadArtifact("ERC1967Proxy");
  const proxyBytecodeHash = utils.hashBytecode(proxyArtifact.bytecode);

  // Calculate the proxy address
  const initialOwner = wallet.address;
  const contract = new Contract(implementationAddress, artifact.abi);
  const initData = contract.interface.encodeFunctionData("initialize", [
    initialOwner,
  ]);

  const constructorArgs = [implementationAddress, initData];

  const encodedConstructorArguments =
    hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "bytes"],
      constructorArgs
    );

  const proxyAddress = utils.create2Address(
    "0x0000000000000000000000000000000000010000",
    proxyBytecodeHash,
    ZeroHash,
    encodedConstructorArguments
  );

  console.log(`SessionKeyPolicyRegistry proxy address: ${proxyAddress}`);

  // Connect to the registry contract
  const registry = new Contract(proxyAddress, artifact.abi, wallet);

  // Check if the wallet has the MANAGER_ROLE
  const MANAGER_ROLE = await registry.MANAGER_ROLE();
  const hasRole = await registry.hasRole(MANAGER_ROLE, wallet.address);

  if (!hasRole) {
    console.error(
      `Wallet ${wallet.address} does not have the MANAGER_ROLE. Cannot add session keys.`
    );
    return;
  }

  // Add each session key configuration to the registry
  for (const config of sessionKeysToApprove) {
    try {
      let tx;

      if (config.type === PolicyType.Call) {
        console.log(
          `Adding Call policy for target: ${config.target}, selector: ${config.selector}`
        );
        tx = await registry.setCallPolicyStatus(
          config.target,
          config.selector,
          config.status
        );
      } else if (config.type === PolicyType.Transfer) {
        console.log(`Adding Transfer policy for target: ${config.target}`);
        tx = await registry.setTransferPolicyStatus(
          config.target,
          config.status
        );
      } else if (config.type === PolicyType.ApprovalTarget) {
        console.log(
          `Adding Approval Target policy for token: ${config.token}, target: ${config.target}`
        );
        tx = await registry.setApprovalTargetStatus(
          config.token,
          config.target,
          config.status
        );
      } else {
        console.warn(`Unknown policy type: ${config.type}. Skipping.`);
        continue;
      }

      // Wait for the transaction to be mined
      await tx.wait();
      console.log(`Transaction successful: ${tx.hash}`);
    } catch (error) {
      console.error(`Error adding session key configuration:`, error);
    }
  }

  console.log(
    `Successfully added ${sessionKeysToApprove.length} session key configurations to the registry.`
  );
}
