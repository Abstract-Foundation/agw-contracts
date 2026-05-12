import { expect } from "chai";
import { getAddress, id } from "ethers";
import * as hre from "hardhat";
import type { Contract, Wallet } from "zksync-ethers";

import {
  deployContract,
  getWallet,
  LOCAL_RICH_WALLETS,
} from "../../deploy/utils";

describe("FeatureRegistry", () => {
  let wallet: Wallet;
  let registry: Contract;
  let resolver: Contract;

  const agw = getAddress("0x000000000000000000000000000000000000f001");
  const sessionKeysId = 3;
  const recoveryId = 5;
  const sessionKeysMask = 1n << BigInt(sessionKeysId);
  const recoveryMask = 1n << BigInt(recoveryId);
  const sessionKeysKey = id("agw.feature.session-keys");
  const recoveryKey = id("agw.feature.recovery");

  beforeEach(async () => {
    wallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
    registry = (await deployContract(hre, "FeatureRegistry", [wallet.address], {
      wallet,
      silent: true,
    })) as unknown as Contract;
    resolver = (await deployContract(hre, "MockFeatureResolver", [], {
      wallet,
      silent: true,
    })) as unknown as Contract;
  });

  async function setFeature(
    featureId: number,
    key: string,
    name: string,
    enabled: boolean,
  ): Promise<void> {
    const tx = await registry.setFeature(
      featureId,
      key,
      name,
      "ipfs://feature-metadata",
      await resolver.getAddress(),
      "0x1234",
      enabled,
    );
    await tx.wait();
  }

  it("stores feature catalog entries by id and key", async () => {
    await setFeature(sessionKeysId, sessionKeysKey, "Session Keys", true);

    const feature = await registry.getFeature(sessionKeysId);
    expect(feature.id).to.eq(sessionKeysId);
    expect(feature.mask).to.eq(sessionKeysMask);
    expect(feature.key).to.eq(sessionKeysKey);
    expect(feature.name).to.eq("Session Keys");
    expect(feature.metadataURI).to.eq("ipfs://feature-metadata");
    expect(feature.resolver).to.eq(await resolver.getAddress());
    expect(feature.resolverData).to.eq("0x1234");
    expect(feature.enabled).to.eq(true);

    const [featureId, exists] = await registry.featureIdOf(sessionKeysKey);
    expect(featureId).to.eq(sessionKeysId);
    expect(exists).to.eq(true);
    expect(await registry.getFeatureMask(sessionKeysId)).to.eq(sessionKeysMask);
    expect(await registry.getFeatureCount()).to.eq(1n);
    expect(await registry.getFeatureIds()).to.deep.eq([BigInt(sessionKeysId)]);
  });

  it("derives support through feature resolvers", async () => {
    await setFeature(sessionKeysId, sessionKeysKey, "Session Keys", true);
    await setFeature(recoveryId, recoveryKey, "Recovery", true);

    const setSupportedTx = await resolver.setSupported(
      agw,
      sessionKeysId,
      true,
    );
    await setSupportedTx.wait();

    expect(await registry.supportsFeature(agw, sessionKeysId)).to.eq(true);
    expect(await registry.supportsFeature(agw, recoveryId)).to.eq(false);
    expect(await registry.supportsAllFeatures(agw, sessionKeysMask)).to.eq(
      true,
    );
    expect(
      await registry.supportsAllFeatures(agw, sessionKeysMask | recoveryMask),
    ).to.eq(false);
    expect(
      await registry.supportsAnyFeature(agw, sessionKeysMask | recoveryMask),
    ).to.eq(true);
    expect(await registry.getSupportedFeatures(agw)).to.eq(sessionKeysMask);
  });

  it("treats disabled or reverting feature resolvers as unsupported", async () => {
    await setFeature(sessionKeysId, sessionKeysKey, "Session Keys", false);
    let setSupportedTx = await resolver.setSupported(agw, sessionKeysId, true);
    await setSupportedTx.wait();

    expect(await registry.supportsFeature(agw, sessionKeysId)).to.eq(false);
    expect(await registry.getSupportedFeatures(agw)).to.eq(0n);

    await setFeature(sessionKeysId, sessionKeysKey, "Session Keys", true);
    const setShouldRevertTx = await resolver.setShouldRevert(true);
    await setShouldRevertTx.wait();

    expect(await registry.supportsFeature(agw, sessionKeysId)).to.eq(false);
    expect(await registry.supportsAnyFeature(agw, sessionKeysMask)).to.eq(
      false,
    );
  });

  it("removes feature catalog entries", async () => {
    await setFeature(sessionKeysId, sessionKeysKey, "Session Keys", true);

    const unsetTx = await registry.unsetFeature(sessionKeysId);
    await unsetTx.wait();

    const [, exists] = await registry.featureIdOf(sessionKeysKey);
    expect(exists).to.eq(false);
    expect(await registry.isFeatureDefined(sessionKeysId)).to.eq(false);
    expect(await registry.getFeatureCount()).to.eq(0n);
    await expect(
      registry.getFeature(sessionKeysId),
    ).to.be.revertedWithCustomError(registry, "FEATURE_NOT_DEFINED");
  });
});
