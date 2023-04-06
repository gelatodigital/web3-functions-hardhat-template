import hre from "hardhat";
import { expect } from "chai";
import { RedstoneOracle } from "../../typechain";
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

describe("RedstoneOracle Tests", function () {
  this.timeout(0);

  let owner: SignerWithAddress;

  let oracle: RedstoneOracle;
  let oracleW3f: Web3FunctionHardhat;
  let userArgs: Web3FunctionUserArgs;

  before(async function () {
    await deployments.fixture();
    await time.increaseTo(Math.floor(Date.now() / 1000));

    [owner] = await hre.ethers.getSigners();
    oracle = await ethers.getContract("RedstoneOracle");
    oracleW3f = w3f.get("redstone");

    userArgs = {
      currency: "ETH",
      oracleAddress: oracle.address,
    };
  });

  it("Update oracle price on first execution", async () => {
    const { result } = await oracleW3f.run({ userArgs });

    expect(result.canExec).to.equal(true);

    const calldata = (result as Web3FunctionResultCanExec).callData;
    await owner.sendTransaction({ to: oracle.address, data: calldata });

    const storedPrice = await oracle.getStoredPrice();
    expect(storedPrice.gt(0)).to.be.true;
  });

  it("Don't update when deviation is too small", async () => {
    const { result } = await oracleW3f.run({ userArgs });
    expect(result.canExec).to.equal(false);

    const message = (result as Web3FunctionResultNotExec).message;
    expect(message).to.equal("No update: price deviation too small");
  });
});
