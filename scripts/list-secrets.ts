import hre from "hardhat";
import { Web3Function } from "@gelatonetwork/automate-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";

const { ethers } = hre;

const main = async () => {
  const name = process.argv[2];
  if (!name) throw new Error("Missing positional argument 'w3f name'");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const web3Function = new Web3Function(chainId, deployer);

  const { secrets } = Web3FunctionLoader.load(name, hre.config.w3f.rootDir);

  await web3Function.secrets.set(secrets);

  // // Get list of secrets
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
