/**
 * Copyright Clave - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import '@matterlabs/hardhat-zksync';
import "@matterlabs/hardhat-zksync-verify";
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@typechain/hardhat';
import dotenv from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';
import type { NetworkUserConfig } from 'hardhat/types';

import './tasks/deploy';

dotenv.config();

const zkSyncMainnet: NetworkUserConfig = {
    url: 'https://mainnet.era.zksync.io',
    ethNetwork: 'mainnet',
    zksync: true,
    verifyURL:
        'https://zksync2-mainnet-explorer.zksync.io/contract_verification',
    chainId: 324,
    enableRip7212: true,
};

const zkSyncSepolia: NetworkUserConfig = {
    url: 'https://sepolia.era.zksync.dev',
    ethNetwork: 'sepolia',
    zksync: true,
    verifyURL: 'https://explorer.sepolia.era.zksync.dev/contract_verification',
    chainId: 300,
    enableRip7212: true,
};

const inMemoryNode: NetworkUserConfig = {
    url: 'http://127.0.0.1:8011',
    ethNetwork: '', // in-memory node doesn't support eth node; removing this line will cause an error
    zksync: true,
    chainId: 260,
    enableRip7212: true,
};

const dockerizedNode: NetworkUserConfig = {
    url: 'http://localhost:3050',
    ethNetwork: 'http://localhost:8545',
    zksync: true,
    chainId: 270,
    enableRip7212: true,
};

const abstractTestnet: NetworkUserConfig = {
    url: "https://api.testnet.abs.xyz",
    ethNetwork: "sepolia",
    zksync: true,
    verifyURL: 'https://api-explorer-verify.testnet.abs.xyz/contract_verification',
    chainId: 11124,
}

const abstractMainnet: NetworkUserConfig = {
    url: "https://api.mainnet.abs.xyz",
    ethNetwork: "mainnet",
    zksync: true,
    verifyURL: 'https://api-explorer-verify.mainnet.abs.xyz/contract_verification',
    chainId: 2741,
}

const config: HardhatUserConfig = {
    zksyncAnvil: {
        version: "0.6.8",
    },
    zksolc: {
        version: '1.5.6',
        settings: {
            enableEraVMExtensions: true,
            optimizer: process.env.TEST
                ? {
                      mode: 'z',
                  }
                : undefined,
        },
    },
    defaultNetwork: 'abstractTestnet',
    etherscan: {
        apiKey: process.env.ABSSCAN_API_KEY,
        customChains: [
            {
                network: 'abstractTestnet',
                chainId: 11124,
                urls: {
                    apiURL: 'https://api-sepolia.abscan.org/api',
                    browserURL: 'https://sepolia.abscan.org',
                },
            },
            {
                network: 'abstractMainnet',
                chainId: 2741,
                urls: {
                    apiURL: 'https://api.abscan.org/api',
                    browserURL: 'https://abscan.org',
                },
            },
        ],
    },
    networks: {
        hardhat: {
            zksync: true,
            enableRip7212: true,
        },
        zkSyncSepolia,
        zkSyncMainnet,
        abstractTestnet,
        abstractMainnet,
        inMemoryNode,
        dockerizedNode,
    },
    solidity: {
        version: '0.8.26',
        settings: {
            evmVersion: 'cancun',
        }
    },
};

export default config;
