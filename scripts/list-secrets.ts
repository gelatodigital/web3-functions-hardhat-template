import hre from "hardhat";
const { ethers } = hre;
import { Web3Function } from "@gelatonetwork/automate-sdk";

const main = async () => {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const web3Function = new Web3Function(chainId, deployer);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list();
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
