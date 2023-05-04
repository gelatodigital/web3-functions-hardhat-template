import hre from "hardhat";
import { Web3Function } from "@gelatonetwork/automate-sdk";

const { ethers } = hre;

const main = async () => {
  const taskId = process.argv[2];

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const web3Function = new Web3Function(chainId, deployer);

  // // Get list of secrets
  const secretsList = await web3Function.secrets.list(taskId);
  console.log(`Secrets list: `);
  console.dir(secretsList);
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
