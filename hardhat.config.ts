import { HardhatUserConfig } from "hardhat/config";

// PLUGINS
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";

// ================================= TASKS =========================================

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

// Libraries
import assert from "assert";

// Process Env Variables
const ALCHEMY_ID = process.env.ALCHEMY_ID;
assert.ok(ALCHEMY_ID, "no Alchemy ID in process.env");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// ================================= CONFIG =========================================
const config: HardhatUserConfig = {
  w3f: {
    functions: {
      helloWorld: { path: "./web3-functions/index.ts", userArgs: {} },
      adboard: { path: "./web3-functions/examples/advertising-board/index.ts" },
      event: {
        path: "./web3-functions/examples/event-listener/index.ts",
        userArgs: {
          counter: "0x8F143A5D62de01EAdAF9ef16d4d3694380066D9F",
          oracle: "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da",
        },
      },
      oracle: {
        path: "./web3-functions/examples/oracle/index.ts",
        userArgs: {
          currency: "ethereum",
          oracle: "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da",
        },
      },
      secrets: {
        path: "./web3-functions/examples/secrets/index.ts",
        userArgs: {
          currency: "ethereum",
          oracle: "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da",
        },
      },
      storage: { path: "./web3-functions/examples/storage/index.ts" },
    },
    debug: false,
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
  },

  defaultNetwork: "hardhat",

  networks: {
    hardhat: {
      forking: {
        url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_ID}`,
        blockNumber: 8664000,
      },
    },

    // Prod
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    ethereum: {
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      chainId: 10,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    polygon: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    // Staging
    arbitrumGoerli: {
      url: `https://arb-goerli.g.alchemy.com/v2/${ALCHEMY_ID}`,
      chainId: 421613,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    goerli: {
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], // control with dev multisig
      chainId: 5,
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_ID}`,
    },
    mumbai: {
      chainId: 80001,
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_ID}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },

  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY ? ETHERSCAN_API_KEY : "",
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: { enabled: true },
        },
      },
    ],
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
