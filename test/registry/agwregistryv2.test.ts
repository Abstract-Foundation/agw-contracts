import { expect } from "chai";
import { getAddress, ZeroAddress } from "ethers";
import * as hre from "hardhat";
import type { Contract, Wallet } from "zksync-ethers";

import {
  deployContract,
  getWallet,
  LOCAL_RICH_WALLETS,
} from "../../deploy/utils";

describe("AGWRegistryV2", () => {
  let wallet: Wallet;

  const account = getAddress("0x000000000000000000000000000000000000a001");
  const otherAccount = getAddress("0x000000000000000000000000000000000000a002");
  const VERSION_NONE = 0;
  const VERSION_V1 = 1;
  const VERSION_V2 = 2;

  before(async () => {
    wallet = getWallet(hre, LOCAL_RICH_WALLETS[0].privateKey);
  });

  async function deployRegistryV2(
    v1Registry: string = ZeroAddress,
  ): Promise<Contract> {
    return (await deployContract(
      hre,
      "AGWRegistryV2",
      [wallet.address, v1Registry],
      {
        wallet,
        silent: true,
      },
    )) as unknown as Contract;
  }

  it("registers local AGW versions", async () => {
    const registry = await deployRegistryV2();

    const tx = await registry.register(account, VERSION_V2);
    await tx.wait();

    expect(await registry.isAGW(account)).to.eq(true);
    expect(await registry.versionOf(account)).to.eq(VERSION_V2);
    expect(await registry.isAGWVersion(account, VERSION_V2)).to.eq(true);
    expect(await registry.isAGWVersion(account, VERSION_V1)).to.eq(false);
  });

  it("noops fallback reads when the v1 registry is not configured", async () => {
    const registry = await deployRegistryV2();

    expect(await registry.isAGW(otherAccount)).to.eq(false);
    expect(await registry.versionOf(otherAccount)).to.eq(VERSION_NONE);
    expect(await registry.isAGWVersion(otherAccount, VERSION_V1)).to.eq(false);
  });

  it("falls back to the v1 registry when no local version is set", async () => {
    const v1Registry = (await deployContract(
      hre,
      "AGWRegistry",
      [wallet.address],
      {
        wallet,
        silent: true,
      },
    )) as unknown as Contract;
    const registerV1Tx = await v1Registry.register(account);
    await registerV1Tx.wait();

    const registry = await deployRegistryV2(await v1Registry.getAddress());

    expect(await registry.isAGW(account)).to.eq(true);
    expect(await registry.versionOf(account)).to.eq(VERSION_V1);
    expect(await registry.isAGWVersion(account, VERSION_V1)).to.eq(true);
    expect(await registry.isAGWVersion(account, VERSION_V2)).to.eq(false);
  });

  it("uses local versions before falling back to the v1 registry", async () => {
    const v1Registry = (await deployContract(
      hre,
      "AGWRegistry",
      [wallet.address],
      {
        wallet,
        silent: true,
      },
    )) as unknown as Contract;
    const registerV1Tx = await v1Registry.register(account);
    await registerV1Tx.wait();

    const registry = await deployRegistryV2(await v1Registry.getAddress());
    const registerV2Tx = await registry.register(account, VERSION_V2);
    await registerV2Tx.wait();

    expect(await registry.versionOf(account)).to.eq(VERSION_V2);
    expect(await registry.isAGWVersion(account, VERSION_V1)).to.eq(false);
    expect(await registry.isAGWVersion(account, VERSION_V2)).to.eq(true);

    const unregisterTx = await registry.unregister(account);
    await unregisterTx.wait();

    expect(await registry.versionOf(account)).to.eq(VERSION_V1);
    expect(await registry.isAGWVersion(account, VERSION_V1)).to.eq(true);
  });
});
