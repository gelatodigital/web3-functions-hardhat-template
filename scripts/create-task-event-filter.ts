import {
  AutomateSDK,
  TriggerType,
  Web3Function,
} from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

const { ethers, w3f } = hre;

const main = async () => {
  const eventTest = w3f.get("event-test");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);
  const web3Function = new Web3Function(chainId, deployer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const cid = await eventTest.deploy();
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using automate sdk
  console.log("Creating automate task...");
  const addressA = "0x23e359eCAB56210f4b8B559218C4d27A85b052b8";

  //This is native usdc on polygon mumbai by circle:
  //https://developers.circle.com/stablecoins/docs/usdc-on-test-networks
  // Faucet: https://faucet.circle.com/?_gl=1*1b3o0nq*_ga*MTU4OTc0MDM0My4xNzA0ODc4NDM3*_ga_GJDVPCQNRV*MTcwNTU1MjI1My4zLjEuMTcwNTU1MjI4NS4yOC4wLjA.
  const nativeUsdc_contract = "0x9999f7fea5938fd3b1e26a12c3f2fb024e194f97";
  const nativeUsdc_eABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ];
  const usdcInterface = new ethers.utils.Interface(nativeUsdc_eABI);

  const { taskId, tx } = await automate.createBatchExecTask({
    name: "Web3Function - Event Filter USDC",
    web3FunctionHash: cid,
    trigger: {
      type: TriggerType.EVENT,
      filter: {
        address: nativeUsdc_contract,
        topics: [
          [usdcInterface.getEventTopic("Transfer")],
          [ethers.utils.hexZeroPad(addressA, 32)],
        ],
      },
      blockConfirmations: 5,
    },
  });

  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );

  // Set task specific secrets
  const secrets = eventTest.getSecrets();
  if (Object.keys(secrets).length > 0) {
    await web3Function.secrets.set(secrets, taskId);
    console.log(`Secrets set`);
  }
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
