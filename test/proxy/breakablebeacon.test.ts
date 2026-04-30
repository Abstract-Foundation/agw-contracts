import { expect } from "chai";
import { getAddress, ZeroAddress } from "ethers";
import * as hre from "hardhat";
import type { Wallet } from "zksync-ethers";
import { Contract, Provider } from "zksync-ethers";

import { LOCAL_RICH_WALLETS, getWallet } from "../../deploy/utils";
import { ClaveDeployer } from "../utils/deployer";

const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

const storageAddress = (value: string): string => {
  return getAddress(`0x${value.slice(-40)}`);
};

describe("BreakableBeaconProxy", () => {
  let deployer: ClaveDeployer;
  let provider: Provider;
  let ownerWallet: Wallet;
  let otherWallet: Wallet;
  let mockAbi: unknown[];

  before(async () => {
    ownerWallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
    otherWallet = getWallet(hre, LOCAL_RICH_WALLETS[1].privateKey);
    deployer = new ClaveDeployer(hre, ownerWallet);
    provider = new Provider(hre.network.config.url, undefined, {
      cacheTimeout: -1,
    });

    mockAbi = (await hre.zksyncEthers.loadArtifact("MockBreakableUpgradeable"))
      .abi;
  });

  const deployFixture = async (): Promise<{
    owner: string;
    implementationV2: Contract;
    implementationV3: Contract;
    beacon: Contract;
    proxy: Contract;
    proxied: Contract;
  }> => {
    const owner = await ownerWallet.getAddress();
    const implementationV1 = await deployer.deployCustomContract(
      "MockBreakableUpgradeable",
      [1],
    );
    const implementationV2 = await deployer.deployCustomContract(
      "MockBreakableUpgradeable",
      [2],
    );
    const implementationV3 = await deployer.deployCustomContract(
      "MockBreakableUpgradeable",
      [3],
    );
    const beacon = await deployer.deployCustomContract("MockBeacon", [
      await implementationV1.getAddress(),
    ]);
    const proxy = await deployer.deployCustomContract("BreakableBeaconProxy", [
      await beacon.getAddress(),
    ]);
    const proxied = new Contract(
      await proxy.getAddress(),
      mockAbi,
      ownerWallet,
    );

    await (await proxied.initialize(owner, 123)).wait();

    return {
      owner,
      implementationV2,
      implementationV3,
      beacon,
      proxy,
      proxied,
    };
  };

  const expectProxySlots = async (
    proxy: Contract,
    expectedBeacon: string,
    expectedImplementation: string,
  ): Promise<void> => {
    const proxyAddress = await proxy.getAddress();
    const [beaconSlot, implementationSlot] = await Promise.all([
      provider.getStorage(proxyAddress, BEACON_SLOT),
      provider.getStorage(proxyAddress, IMPLEMENTATION_SLOT),
    ]);

    expect(storageAddress(beaconSlot)).to.eq(getAddress(expectedBeacon));
    expect(storageAddress(implementationSlot)).to.eq(
      getAddress(expectedImplementation),
    );
  };

  it("delegates through the beacon before it is broken", async () => {
    const { owner, implementationV2, beacon, proxy, proxied } =
      await deployFixture();

    expect(await proxied.version()).to.eq(1n);
    expect(await proxied.value()).to.eq(123n);
    expect(await proxied.owner()).to.eq(owner);

    await (await beacon.upgradeTo(await implementationV2.getAddress())).wait();

    expect(await proxied.version()).to.eq(2n);
    expect(await proxied.value()).to.eq(123n);
    await expectProxySlots(proxy, await beacon.getAddress(), ZeroAddress);
  });

  it("breaks away from the beacon during a UUPS upgrade", async () => {
    const {
      owner,
      implementationV2,
      implementationV3,
      beacon,
      proxy,
      proxied,
    } = await deployFixture();

    await (
      await proxied.upgradeToAndCall(await implementationV2.getAddress(), "0x")
    ).wait();

    expect(await proxied.version()).to.eq(2n);
    expect(await proxied.value()).to.eq(123n);
    expect(await proxied.owner()).to.eq(owner);
    await expectProxySlots(
      proxy,
      ZeroAddress,
      await implementationV2.getAddress(),
    );

    await (await beacon.upgradeTo(await implementationV3.getAddress())).wait();

    expect(await proxied.version()).to.eq(2n);
  });

  it("continues to support UUPS upgrades after it is broken", async () => {
    const { implementationV2, implementationV3, proxy, proxied } =
      await deployFixture();

    await (
      await proxied.upgradeToAndCall(await implementationV2.getAddress(), "0x")
    ).wait();
    await (
      await proxied.upgradeToAndCall(await implementationV3.getAddress(), "0x")
    ).wait();

    expect(await proxied.version()).to.eq(3n);
    await expectProxySlots(
      proxy,
      ZeroAddress,
      await implementationV3.getAddress(),
    );
  });

  it("does not break the beacon when authorization fails", async () => {
    const { implementationV2, beacon, proxy, proxied } = await deployFixture();

    await expect(
      proxied
        .connect(otherWallet)
        .upgradeToAndCall(await implementationV2.getAddress(), "0x"),
    ).to.be.revertedWithCustomError(proxied, "NotOwner");

    expect(await proxied.version()).to.eq(1n);
    await expectProxySlots(proxy, await beacon.getAddress(), ZeroAddress);
  });
});
