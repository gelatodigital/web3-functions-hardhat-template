import hre from "hardhat";
import { expect } from "chai";
import { before } from "mocha";
import { Web3FunctionUserArgs } from "@gelatonetwork/web3-functions-sdk";
const { deployments, w3f } = hre;

describe("HelloWorld Tests", function () {
  this.timeout(0);

  let userArgs: Web3FunctionUserArgs;
  let storage: { [key: string]: string };

  before(async function () {
    await deployments.fixture();

    userArgs = {};
    storage = {};
  });

  it("Return canExec: true", async () => {
    const { result } = await w3f.run("helloWorld", storage, userArgs);
    expect(result.canExec).to.equal(true);
  });
});
