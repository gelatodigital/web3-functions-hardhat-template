import hre from "hardhat";
import { expect } from "chai";
import { CoingeckoOracle } from "../../typechain";
import { before } from "mocha";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  Web3FunctionUserArgs,
  Web3FunctionResultV2,
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
    let { result } = await oracleW3f.run("onRun",{ userArgs });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.equal(true);
    if (!result.canExec) throw new Error("!result.canExec");

    const calldata = result.callData[0];
    await owner.sendTransaction({ to: calldata.to, data: calldata.data });

    const lastUpdated = await oracle.lastUpdated();
    const timeNow = await time.latest();

    expect(lastUpdated).to.equal(timeNow);
  });

  it("canExec: false - After execution", async () => {
    let { result } = await oracleW3f.run("onRun",{ userArgs });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.equal(false);
    if (result.canExec) throw new Error("result.canExec");

    const message = result.message;
    expect(message).to.equal("Time not elapsed");
  });

  it("canExec: true - Time elapsed", async () => {
    const ONE_HOUR = 60 * 60;
    await time.increase(ONE_HOUR);

    const { result } = await oracleW3f.run("onRun",{ userArgs });
    expect(result.canExec).to.equal(true);
  });
});
