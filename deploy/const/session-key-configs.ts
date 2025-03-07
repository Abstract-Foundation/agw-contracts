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
    type: PolicyType.ApprovalTarget,
    token: "0x57E12aBdF617FcD0D2ab6984C289075aA90CAc8C",
    target: "0xF99E6e273a90Fac72F3692B033A46e8b602DC44e",
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0xF99E6e273a90Fac72F3692B033A46e8b602DC44e",
    selector: "0xee026cab", // burnAndMint(uint256[],uint256[])
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
    selector: "0x2e599054", // depositETH(address,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0x8340f549", // deposit(address,address,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xf14210a6", // withdrawETH(uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xf3fef3a3", // withdraw(address,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xc2708f09", // expire((address,address,uint32,uint64,address,uint96,address,bytes))
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0xbc011e72", // solve((address,address,uint32,uint64,address,uint96,address,bytes),bytes32,bytes)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0b4429576e5ed44a1b8f676c8217eb45707afa3d",
    selector: "0x19b410fe", // coin((address,address,uint32,uint64,address,uint96,address,bytes),bytes,uint256)
    status: Status.Allowed,
  },
];

const sampleConfig3: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    selector: "0x3620875e", // sell(uint256,uint256,uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    selector: "0x1281311d", // buy(uint256,uint256,uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x4f4988A910f8aE9B3214149A8eA1F2E4e3Cd93CC",
    selector: "0x677bd9ff", // claimWinnings(uint256)
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
    selector: "0xcce7ec13", // buy(address,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x42b2c802205b908030Bc374c1D30Cc4997FC199a",
    selector: "0xe1adf47b", // sell(address,uint112,uint112)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x42b2c802205b908030Bc374c1D30Cc4997FC199a",
    selector: "0x028221cc", // deployToken(address,address,string,string,uint256,string,string,bytes32)
    status: Status.Allowed,
  },
];

const sampleConfig5: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x3439153EB7AF838Ad19d56E1571FBD09333C2809",
    selector: "0x2e1a7d4d", // withdraw(uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x3272596F776470D2D7C3f7dfF3dc50888b7D8967",
    selector: "0xf310d2e6", // purchaseETH(uint256,uint16,address,address,uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x3272596F776470D2D7C3f7dfF3dc50888b7D8967",
    selector: "0x83a84ba9", // claimReferralFees()
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x3272596F776470D2D7C3f7dfF3dc50888b7D8967",
    selector: "0x379607f5", // claim(uint256)
    status: Status.Allowed,
  },
  
];

const sampleConfig6: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0xB4b55C656c6b89f020a6E1044B66D227B638C474",
    selector: "0x08bc2601", // requestTokenSpin(uint8,address,uint256)
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
    selector: "0x073f5da3", // joinTournament(bytes,string,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0C1Fb514EEe951F43d549666Bec113D9ADcFBf98",
    selector: "0xda568094", // claimPrize(bytes,string,uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0C1Fb514EEe951F43d549666Bec113D9ADcFBf98",
    selector: "0xdaa462ae", // claimMultiplePrizes(bytes[],string[],uint256[],uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x1FD611a870c44f8EFa82CF62B67499D141abD7E9",
    selector: "0x8589ee97", // claimReferral(bytes,string,uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x1FD611a870c44f8EFa82CF62B67499D141abD7E9",
    selector: "0xda4053ac", // claimMultipleReferrals(bytes[],string[],uint256[],uint256)
    status: Status.Allowed,
  },
];

const sampleConfig8: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x3B50dE27506f0a8C1f4122A1e6F470009a76ce2A",
    selector: "0x7060a227",
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xf242432a", // safeTransferFrom(address,address,uint256,uint256,bytes)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x2eb2c2d6", // safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xdef25acb", // createDrop(uint256,uint256,bool,bool,bytes,uint256,uint256,uint256,uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x7f58b4bf", // mintToken(uint256,bytes,uint256,bool,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xeefdc1df", // mintTokenByCreator(uint256,bytes,address,uint256,bool,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x42d96dd7", // refundToken(uint256,uint256,uint256,bytes)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x91eb290e", // batchRedeem(uint256[],uint256,uint256[],bytes)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x96949420", // joinQueue(uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xae796ab3", // leaveQueue(uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x0dce83c7", // commitQueue(uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0xd8d07eda", // revealQueue(uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x458422e93BF89A109afc4fac00aAcF2F18FcF541",
    selector: "0x5beaa049", // claimFromQueue(uint256)
    status: Status.Allowed,
  },
];

const sampleConfig9: PolicyConfig[] = [
  {
    type: PolicyType.Call,
    target: "0x0DA6Bfd5d50edb31AF14C3A7820d28dB475Ec97D",
    selector: "0x2268a972", // buyCredits(string,uint256,address) 
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x0DA6Bfd5d50edb31AF14C3A7820d28dB475Ec97D",
    selector: "0xeccc35fe", // sellCredits(string,uint256,address)
    status: Status.Allowed,
  }, 
  {
    type: PolicyType.Call,
    target: "0x0DA6Bfd5d50edb31AF14C3A7820d28dB475Ec97D",
    selector: "0x406f9248", // claimCreatorFee(string)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0x45351035", // requestServiceExecution(uint256,string)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0xbc467855", // acceptServiceExecution(uint256,uint256,string)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0xa7e52baa", // cancelServiceExecution(uint256,uint256,string)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0x2add845c", // disputeServiceExecution(uint256,uint256,string)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0x14879aae", // validateServiceExecution(uint256,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0x7b15f1b6", // createService(string,string,uint256)
    status: Status.Allowed,
  },
  {
    type: PolicyType.Call,
    target: "0x89e74F963e506D6921FF33cB75b53b963D7218bE",
    selector: "0x52a74c0a", // createAndUpdateFromService(uint256,uint256)
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
  ...sampleConfig9,
];
