import { Interface } from "@ethersproject/abi";
import {
  Web3Function,
  Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from "ky";

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
  // Destructure userArgs from context
  const { userArgs, log } = context;

  const contractInterface = new Interface([userArgs.event as string]);

  try {
    // Parse the event from the log using the provided event ABI
    console.log("Parsing event");
    const event = contractInterface.parseLog(log);

    // Handle event data
    console.log(`Event detected: ${JSON.stringify(event)}`);

    try {
      // Send a POST request to the webhook URL with the event data
      const response = await ky
        .post(userArgs.webhookUrl as string, {
          json: {
            event: event.name,
            args: {
              from: event.args.from,
              to: event.args.to,
              value: event.args.value.toString(), // Convert BigNumber to string
            },
            transactionHash: log.transactionHash,
          },
        })
        .json();

      console.log(`Webhook response: ${JSON.stringify(response)}`);
    } catch (error) {
      // If an error occurs, log the error.
      console.error(`Error during POST request: ${error}`);
    }

    return { canExec: false, message: `Event processed and webhook called` };
  } catch (err) {
    return {
      canExec: false,
      message: `Failed to parse event: ${(err as Error).message}`,
    };
  }
});
