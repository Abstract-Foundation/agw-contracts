import * as hre from "hardhat";
import { Contract } from "zksync-ethers";
import { getWallet } from "../deploy/utils";
import {
  PolicyConfig,
  PolicyType,
  sessionKeysToApprove,
  Status,
} from "./const/session-key-configs";

export default async function (): Promise<void> {
  // Get the wallet for signing transactions
  const wallet = getWallet(hre);

  // Use the default registry contract address from create2 or override if one is provided via CLI args
  const DEFAULT_REGISTRY_ADDRESS = "0xfD20b9d7A406e2C4f5D6Df71ABE3Ee48B2EccC9F";
  const registryAddress =
    process.argv.slice(2).indexOf("--registry-address") >= 0
      ? process.argv[process.argv.slice(2).indexOf("--registry-address") + 3]
      : DEFAULT_REGISTRY_ADDRESS;

  console.log(
    `Using SessionKeyPolicyRegistry at address: ${registryAddress}\n`
  );

  // Connect to the registry contract
  const artifact = await hre.zksyncEthers.loadArtifact(
    "SessionKeyPolicyRegistry"
  );
  const registry = new Contract(registryAddress, artifact.abi, wallet);

  // Check if the wallet has the MANAGER_ROLE to add policies to the registry
  const MANAGER_ROLE = await registry.MANAGER_ROLE();
  const hasRole = await registry.hasRole(MANAGER_ROLE, wallet.address);
  if (!hasRole) {
    console.error(
      `Wallet ${wallet.address} does not have the MANAGER_ROLE. Cannot add session keys.`
    );
    return;
  }

  // Helper function to process a policy configuration
  async function processPolicyConfig(config: PolicyConfig): Promise<void> {
    let currentStatus;
    let tx;
    let description = "";

    switch (config.type) {
      case PolicyType.Call:
        description = `Call policy for target: ${config.target}, selector: ${config.selector}`;
        currentStatus = Number(await registry.getCallPolicyStatus(
          config.target,
          config.selector
        ));

        if (currentStatus === config.status) {
          console.warn(
            `${description} already set to ${Status[config.status]}. Skipping.`
          );
          return;
        }

        tx = await registry.setCallPolicyStatus(
          config.target,
          config.selector,
          config.status
        );
        break;

      case PolicyType.Transfer:
        description = `Transfer policy for target: ${config.target}`;
        currentStatus = Number(await registry.getTransferPolicyStatus(config.target));

        if (currentStatus === config.status) {
          console.warn(
            `${description} already set to ${Status[config.status]}. Skipping.`
          );
          return;
        }

        tx = await registry.setTransferPolicyStatus(
          config.target,
          config.status
        );
        break;

      case PolicyType.ApprovalTarget:
        description = `Approval Target policy for token: ${config.token}, target: ${config.target}`;
        currentStatus = Number(await registry.getApprovalTargetStatus(
          config.token,
          config.target
        ));

        if (currentStatus === config.status) {
          console.warn(
            `${description} already set to ${Status[config.status]}. Skipping.`
          );
          return;
        }

        tx = await registry.setApprovalTargetStatus(
          config.token,
          config.target,
          config.status
        );
        break;

      default:
        console.error(
          `Unknown policy type: ${(config as any).type}. Skipping.`
        );
        return;
    }

    await tx.wait();
    console.log(
      `Added ${description}` + `\n` + `Transaction hash: ${tx.hash}` + `\n`
    );
  }

  // Process each session key configuration
  for (const config of sessionKeysToApprove) {
    await processPolicyConfig(config);
  }

  console.log(
    `Successfully added ${sessionKeysToApprove.length} session key configurations to the registry.`
  );
}
