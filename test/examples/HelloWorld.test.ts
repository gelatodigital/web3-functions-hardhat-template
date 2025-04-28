import * as hre from "hardhat";
import { expect } from "chai";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";

describe("HelloWorld Tests", function () {
  this.timeout(0);

  let helloWorld: Web3FunctionHardhat;

  before(async () => {
    const { deployments, w3f } = hre;
    await deployments.fixture();
    helloWorld = w3f.get("hello-world");
  });

  it("Return canExec: true", async () => {
    const { result } = await helloWorld.run("onRun");
    expect(result.canExec).to.equal(true);
  });
}); 