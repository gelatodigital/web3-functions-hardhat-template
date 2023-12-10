import {
  Web3Function,
  Web3FunctionContext,
  Web3FunctionFailContext,
  Web3FunctionSuccessContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "@ethersproject/contracts";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

//Web3 Function onSuccess callback
Web3Function.onSuccess(async (context: Web3FunctionSuccessContext) => {
  const { userArgs, transactionHash } = context;
  console.log("userArgs: ", userArgs.canExec);
  console.log("onSuccess: txHash: ", transactionHash);
});

// Add your Slack Webhook URL
const SLACK_WEBHOOK_URL = "YOUR_SLACK_WEBHOOK_URL";

// Function to send Slack alerts
async function sendSlackAlert(message: string) {
  try {
    await ky.post(SLACK_WEBHOOK_URL, {
      json: { text: message },
    });
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}

//Web3 Function onFail callback
Web3Function.onFail(async (context: Web3FunctionFailContext) => {
  const { userArgs, reason, secrets } = context;

  ///// SECRETS////////
  // SECRETS_SENGRID_API ---> SENGRID_API - APIKEY
  // SECRETS_FROM_EMAIL ---> EMAIL - Address from send e mails
  // SECRETS_TO_EMAIL ---> EMAIL - Address to send e mails
  const apikey = (await secrets.get("SENGRID_API")) as string;
  const from = (await secrets.get("FROM_EMAIL")) as string;
  const to = (await secrets.get("TO_EMAIL")) as string;

  let alertMessage = `Web3 Function Failed. Reason: ${reason}`;
  console.log("userArgs: ", userArgs.canExec);

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

  // Check the type of alert specified in userArgs
  const alertType = userArgs.onFailAlertType as string | undefined;

  // Send Slack alert if specified
  if (alertType === "slack" || alertType === "both") {
    await sendSlackAlert(alertMessage);
  }

  // Send email alert if specified
  if (alertType === "email" || alertType === "both") {
    const mailOptions: SendmailOptions = {
      apikey: apikey, // Replace with your actual API key
      from: from, // Replace with your sender email
      to: to, // Replace with your receiver email
      subject: "Web3 Function Execution Failure",
      text: alertMessage,
    };
    await sendmail(mailOptions);
  }
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
    const coingeckoApi = `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`;

    const priceData: { [key: string]: { usd: number } } = await ky
      .get(coingeckoApi, { timeout: 5_000, retry: 0 })
      .json();
    price = Math.floor(priceData[currency].usd);
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

interface SendmailOptions {
  apikey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

// Function to send email alerts using SendGrid
async function sendmail(options: SendmailOptions) {
  try {
    await ky.post("https://api.sendgrid.com/v3/mail/send", {
      headers: {
        Authorization: `Bearer ${options.apikey}`,
        "Content-Type": "application/json",
      },
      json: {
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: options.from },
        subject: options.subject,
        content: [{ type: "text/plain", value: options.text }],
      },
    });
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
