import { deployments, getNamedAccounts } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (hre.network.name !== "hardhat") {
    console.log(
      `Deploying AdvertisingBoard to ${hre.network.name}. Hit ctrl + c to abort`
    );
  }

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const opsProxyFactory =
    hre.network.name === "zksync"
      ? "0xB675ce934431e42Fd3daE03e3a385b7e24ae7257"
      : hre.network.name === "avalanche"
      ? "0x2807B4aE232b624023f87d0e237A3B1bf200Fd99"
      : "0x44bde1bccdD06119262f1fE441FBe7341EaaC185";

  await deploy("AdvertisingBoard", {
    from: deployer,
    log: hre.network.name !== "hardhat",
    args: [opsProxyFactory],
  });
};

export default func;

func.tags = ["AdvertisingBoard"];
