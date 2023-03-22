import hre from "hardhat";
const { ethers } = hre;
import { Web3Function } from "@gelatonetwork/automate-sdk";

const main = async () => {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const web3Function = new Web3Function(chainId, deployer);

  // Remove each key passed as argument
  if (process.argv.length > 2) {
    const keys = process.argv.slice(2);
    for (const key of keys) {
      await web3Function.secrets.delete(key.trim());
    }
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
