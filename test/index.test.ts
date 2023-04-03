import hre from "hardhat";
import { expect } from "chai";
import { before } from "mocha";
import { W3fHardhatClass } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
const { deployments, w3f } = hre;

describe("HelloWorld Tests", function () {
  this.timeout(0);

  let helloWorld: W3fHardhatClass;

  before(async function () {
    await deployments.fixture();

    helloWorld = w3f.get("hello-world");
  });

  it("Return canExec: true", async () => {
    const { result } = await helloWorld.run();

    expect(result.canExec).to.equal(true);
  });
});
