export enum PolicyType {
  Call = 0,
  Transfer = 1,
  ApprovalTarget = 2,
}

export enum Status {
  Unset = 0,
  Allowed = 1,
  Blocked = 2,
}

interface BaseConfig {
  type: PolicyType;
  status: Status;
}

interface CallPolicyConfig extends BaseConfig {
  type: PolicyType.Call;
  target: string;
  selector: string;
}

interface TransferPolicyConfig extends BaseConfig {
  type: PolicyType.Transfer;
  target: string;
}

interface ApprovalTargetPolicyConfig extends BaseConfig {
  type: PolicyType.ApprovalTarget;
  token: string;
  target: string;
}

export type PolicyConfig =
  | CallPolicyConfig
  | TransferPolicyConfig
  | ApprovalTargetPolicyConfig;

const sampleConfig0: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x57E12aBdF617FcD0D2ab6984C289075aA90CAc8C",
    selector: "0xa22cb465", // setApprovalForAll selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0xF99E6e273a90Fac72F3692B033A46e8b602DC44e",
    selector: "0x42966c68", // burnAndMint selector
    status: Status.Allowed,
  },
];

const sampleConfig1: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x11614eE1eF07dEe4AC28893a00F6F63B13223906",
    selector: "0x3beba5c7",
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x11614eE1eF07dEe4AC28893a00F6F63B13223906",
    selector: "0x00f041ef",
    status: Status.Allowed,
  },
];

const sampleConfig2: PolicyConfig[] = [
  {
    type: PolicyType.ApprovalTarget,
    token: "0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1", // USDC
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
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
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xc2708f09", // expire selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xbc011e72", // solve selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0x19b410fe", // coin selector
    status: Status.Allowed,
  },
];

const sampleConfig3: PolicyConfig[] = [
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
];

const sampleConfig4: PolicyConfig[] = [
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
];

const sampleConfig5: PolicyConfig[] = [
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
];

const sampleConfig6: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0xB4b55C656c6b89f020a6E1044B66D227B638C474",
    selector: "0x9b2c0a37", // requestTokenSpin selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.ApprovalTarget,
    token: "0x9ebe3a824ca958e4b3da772d2065518f009cba62", // PENGU
    target: "0xB4b55C656c6b89f020a6E1044B66D227B638C474",
    status: Status.Allowed,
  },
];

const sampleConfig7: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x03c9FEC896BC1a69EDAafaC47B6A1D473b864078",
    selector: "0x073f5da3", // joinTournament selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0C1Fb514EEe951F43d549666Bec113D9ADcFBf98",
    selector: "0xda568094", // claimPrize selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0C1Fb514EEe951F43d549666Bec113D9ADcFBf98",
    selector: "0xdaa462ae", // claimMultiplePrizes selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x1FD611a870c44f8EFa82CF62B67499D141abD7E9",
    selector: "0x8589ee97", // claimReferral selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x1FD611a870c44f8EFa82CF62B67499D141abD7E9",
    selector: "0xda4053ac", // claimMultipleReferrals selector
    status: Status.Allowed,
  },
];

const sampleConfig8: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xdef25acb", // createDrop selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x7f58b4bf", // mintToken selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xeefdc1df", // mintTokenByCreator
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x42d96dd7", // refundToken selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x91eb290e", // batchRedeem selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x96949420", // joinQueue selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xae796ab3", // leaveQueue selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x0dce83c7", // commitQueue selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xd8d07eda", // revealQueue selector
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x5beaa049", // claimFromQueue selector
    status: Status.Allowed,
  },
];

// Session key configurations to approve from the sample configurations
export const sessionKeysToApprove: PolicyConfig[] = [
  ...sampleConfig0,
  ...sampleConfig1,
  ...sampleConfig2,
  ...sampleConfig3,
  ...sampleConfig4,
  ...sampleConfig5,
  ...sampleConfig6,
  ...sampleConfig7,
  ...sampleConfig8,
];
