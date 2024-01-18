import {
  AutomateSDK,
  TriggerType,
  Web3Function,
} from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

const { ethers, w3f } = hre;

const main = async () => {
  const eventTest = w3f.get("event-filter-webhook");
  const userArgs = eventTest.getUserArgs();

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

  console.log(userArgs.event);
  const contractInterface = new ethers.utils.Interface([
    userArgs.event as string,
  ]);

  const { taskId, tx } = await automate.createBatchExecTask({
    name: "Web3Function - Event Filter USDC",
    web3FunctionHash: cid,
    web3FunctionArgs: {
      event: userArgs.event as string,
      eventTopic: userArgs.eventTopic as string,
      target: userArgs.target as string,
      filter: userArgs.filter as string,
      webhookUrl: userArgs.webhookUrl as string,
    },
    trigger: {
      type: TriggerType.EVENT,
      filter: {
        address: userArgs.target as string,
        topics: [
          [contractInterface.getEventTopic(userArgs.eventTopic as string)],
          [ethers.utils.hexZeroPad(userArgs.filter as string, 32)],
        ],
      },
      blockConfirmations: 0,
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
    if (err.response) {
      console.error("Error Response:", err.response.body);
    } else {
      console.error("Error:", err.message);
    }
    process.exit(1);
  });
