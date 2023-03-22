import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { WrapperBuilder } from "@redstone-finance/evm-connector";

const ORACLE_ABI = [
  "function getStoredPrice() public view returns (uint256)",
  "function getLivePrice() public view returns (uint256)",
  "function getPriceDeviation() external view returns (uint)",
  "function decimals() external pure returns (uint8)",
  "function updatePrice() public",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, provider } = context;
  const oracleAddress = userArgs.oracleAddress as string;
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);

  // Wrap contract with redstone data service
  const wrappedOracle = WrapperBuilder.wrap(oracle).usingDataService(
    {
      dataServiceId: "redstone-rapid-demo",
      uniqueSignersCount: 1,
      dataFeeds: ["ETH"],
      disablePayloadsDryRun: true,
    },
    ["https://d33trozg86ya9x.cloudfront.net"]
  );

  // Retrieve stored & live prices
  const decimals = await wrappedOracle.decimals();
  const livePrice: BigNumber = await wrappedOracle.getLivePrice();
  const storedPrice: BigNumber = await wrappedOracle.getStoredPrice();
  console.log(`Live price: ${livePrice.toString()}`);
  console.log(`Stored price: ${storedPrice.toString()}`);

  // Check price deviation
  const deviation: BigNumber = await wrappedOracle.getPriceDeviation();
  const deviationPrct = (deviation.toNumber() / 10 ** decimals) * 100;
  console.log(`Deviation: ${deviationPrct.toFixed(2)}%`);

  // Only update price if deviation is above 0.2%
  const minDeviation = 0.2;
  if (deviationPrct < minDeviation) {
    return {
      canExec: false,
      message: `No update: price deviation too small`,
    };
  }

  // Craft transaction to update the price on-chain
  const { data } = await wrappedOracle.populateTransaction.updatePrice();
  return {
    canExec: true,
    callData: data as string,
  };
});
