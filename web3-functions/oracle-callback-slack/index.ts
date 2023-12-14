import {
  Web3Function,
  Web3FunctionContext,
  Web3FunctionFailContext,
  Web3FunctionSuccessContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "@ethersproject/contracts";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

// Function to send Slack alerts
async function sendSlackAlert(message: string, webHookUrl: string) {
  try {
    await ky.post(webHookUrl, {
      json: { text: message },
    });
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}

// Helper function to fetch current price from coingecko
async function getCurrentPrice(currency: string): Promise<number> {
  try {
    const coingeckoApi = `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`;
    const priceData = (await ky
      .get(coingeckoApi, { timeout: 5000, retry: 0 })
      .json()) as { [key: string]: { usd: number } };
    return Math.floor(priceData[currency].usd);
  } catch (err) {
    console.error(`Error fetching price for ${currency}:`, err);
    throw new Error("Coingecko call failed");
  }
}

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

//Web3 Function onSuccess callback
Web3Function.onSuccess(async (context: Web3FunctionSuccessContext) => {
  const { userArgs, transactionHash, storage } = context;
  console.log("userArgs: ", userArgs.canExec);
  console.log("onSuccess: txHash: ", transactionHash);

  const currency = (userArgs.currency as string) ?? "ethereum";
  let price = 0;

  try {
    const price = await getCurrentPrice(currency);
    console.log(`Current Price: ${price}`);
    await storage.set("lastPrice", price.toString());
  } catch (err) {
    console.error("Failed to update price:", err);
  }

  // Update storage with the current price
  await storage.set("lastPrice", price.toString());
});

//Web3 Function onFail callback
Web3Function.onFail(async (context: Web3FunctionFailContext) => {
  const { reason } = context;

  const slackWebhookUrl = await context.secrets.get("SLACK_WEBHOOK_URL");
  if (!slackWebhookUrl) {
    console.error("SLACK_WEBHOOK_URL not set in secrets");
    return;
  }

  let alertMessage = `Transaction Failed. Reason: ${reason}`;

  if (reason === "ExecutionReverted") {
    alertMessage += ` TxHash: ${context.transactionHash}`;
    console.log(`onFail: ${reason} txHash: ${context.transactionHash}`);
  } else if (reason === "SimulationFailed") {
    alertMessage += ` callData: ${JSON.stringify(context.callData)}`;
    console.log(
      `onFail: ${reason} callData: ${JSON.stringify(context.callData)}`
    );
  } else {
    console.log(`onFail: ${reason}`);
  }

  // Send Slack alert if specified
  await sendSlackAlert(alertMessage, slackWebhookUrl);
});

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  console.log(`Provider: ${provider.connection.url}`);
  // Retrieve Last oracle update time
  const oracleAddress =
    (userArgs.oracle as string) ?? "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da";
  let lastUpdated;
  let oracle;
  try {
    oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
    lastUpdated = parseInt(await oracle.lastUpdated());
    console.log(`Last oracle update: ${lastUpdated}`);
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  // Check if it's ready for a new update
  const nextUpdateTime = lastUpdated + 3600; // 1h
  const timestamp = (await provider.getBlock("latest")).timestamp;
  console.log(`Next oracle update: ${nextUpdateTime}`);
  if (timestamp < nextUpdateTime) {
    return { canExec: false, message: `Time not elapsed` };
  }

  // Get current price on coingecko
  const currency = (userArgs.currency as string) ?? "ethereum";
  let price = 0;
  try {
    price = await getCurrentPrice(currency);
  } catch (err) {
    return { canExec: false, message: `Coingecko call failed` };
  }
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: [
      {
        to: oracleAddress,
        data: oracle.interface.encodeFunctionData("updatePrice", [price]),
      },
    ],
  };
});
