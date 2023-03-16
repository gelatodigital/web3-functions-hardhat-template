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

    oracle = await ethers.getContract("CoingeckoOracle");

    userArgs = {
      currency: "ethereum",
      oracle: oracle.address,
    };
    storage = {};
  });

  it("canExec: true - First execution", async () => {
    const { result } = await w3f.run("oracle", storage, userArgs);

    expect(result.canExec).to.equal(true);

    const calldata = (result as Web3FunctionResultCanExec).callData;
    await owner.sendTransaction({ to: oracle.address, data: calldata });

    const lastUpdated = await oracle.lastUpdated();
    const timeNow = await time.latest();

    expect(lastUpdated).to.equal(timeNow);
  });

  it("canExec: false - After execution", async () => {
    const { result } = await w3f.run("oracle", storage, userArgs);
    expect(result.canExec).to.equal(false);

    const message = (result as Web3FunctionResultNotExec).message;
    expect(message).to.equal("Time not elapsed");
  });

  it("canExec: true - Time elapsed", async () => {
    const ONE_HOUR = 60 * 60;
    await time.increase(ONE_HOUR);

    const { result } = await w3f.run("oracle", storage, userArgs);
    expect(result.canExec).to.equal(true);
  });
});
