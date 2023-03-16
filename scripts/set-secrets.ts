import hre from "hardhat";
const { ethers, w3f } = hre;
import { Web3Function } from "@gelatonetwork/ops-sdk";

const main = async () => {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const web3Function = new Web3Function(chainId, deployer);

  const secrets = w3f.getSecrets();
  console.log(`Fetched secrets: `);
  console.dir(secrets);

  await web3Function.secrets.set(secrets);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list();
  console.log(`Updated secrets list: `);
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
