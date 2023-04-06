import hre from "hardhat";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import { CoingeckoOracle } from "../typechain";

const { ethers, w3f } = hre;

const main = async () => {
  const oracle = <CoingeckoOracle>await ethers.getContract("CoingeckoOracle");
  const oracleW3f = w3f.get("oracle");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const cid = await oracleW3f.deploy();
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using automate sdk
  console.log("Creating automate task...");
  const { taskId, tx } = await automate.createTask({
    name: "Web3Function - Eth Oracle",
    execAddress: oracle.address,
    execSelector: oracle.interface.getSighash("updatePrice"),
    dedicatedMsgSender: true,
    web3FunctionHash: cid,
    web3FunctionArgs: {
      oracle: oracle.address,
      currency: "ethereum",
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
