import hre from "hardhat";
import { expect } from "chai";
import { CoingeckoOracle } from "../../typechain";
import { before } from "mocha";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  Web3FunctionResultCanExec,
  Web3FunctionResultNotExec,
  Web3FunctionUserArgs,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
const { ethers, deployments, w3f } = hre;

describe("CoingeckoOracle Tests", function () {
  this.timeout(0);

  let owner: SignerWithAddress;

  let oracle: CoingeckoOracle;
  let oracleW3f: Web3FunctionHardhat;
  let userArgs: Web3FunctionUserArgs;

  before(async function () {
    await deployments.fixture();

    [owner] = await hre.ethers.getSigners();

    oracle = await ethers.getContract("CoingeckoOracle");
    oracleW3f = w3f.get("oracle");

    userArgs = {
      currency: "ethereum",
      oracle: oracle.address,
    };
  });

  it("canExec: true - First execution", async () => {
    const { result } = await oracleW3f.run({ userArgs });

    expect(result.canExec).to.equal(true);

    const calldata = (result as Web3FunctionResultCanExec).callData;
    await owner.sendTransaction({ to: oracle.address, data: calldata });

    const lastUpdated = await oracle.lastUpdated();
    const timeNow = await time.latest();

    expect(lastUpdated).to.equal(timeNow);
  });

  it("canExec: false - After execution", async () => {
    const { result } = await oracleW3f.run({ userArgs });
    expect(result.canExec).to.equal(false);

    const message = (result as Web3FunctionResultNotExec).message;
    expect(message).to.equal("Time not elapsed");
  });

  it("canExec: true - Time elapsed", async () => {
    const ONE_HOUR = 60 * 60;
    await time.increase(ONE_HOUR);

    const { result } = await oracleW3f.run({ userArgs });
    expect(result.canExec).to.equal(true);
  });
});
