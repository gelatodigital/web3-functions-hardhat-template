import hre from "hardhat";
import { expect } from "chai";
import {} from "../../typechain";
import { before } from "mocha";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  Web3FunctionResultCanExec,
  Web3FunctionResultNotExec,
  Web3FunctionUserArgs,
} from "@gelatonetwork/web3-functions-sdk";
const { ethers, deployments, w3f } = hre;

describe("CoingeckoOracle Tests", function () {
  this.timeout(0);

  let owner: SignerWithAddress;

  let oracle: CoingeckoOracle;
  let userArgs: Web3FunctionUserArgs;
  let storage: { [key: string]: string };

  before(async function () {
    await deployments.fixture();

    [owner] = await hre.ethers.getSigners();

    userArgs = {};
    storage = {};
  });
});
