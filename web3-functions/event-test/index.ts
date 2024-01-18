import { Interface } from "@ethersproject/abi";
import {
  Web3Function,
  Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";
import { ethers } from "ethers";

const USDC_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
  // Get event log from Web3FunctionEventContext
  const { log } = context;

  try {
    // Parse the USDC Transfer event from ABI
    const USDCInterface = new Interface(USDC_ABI);
    console.log("Parsing USDC Transfer event");
    const event = USDCInterface.parseLog(log);

    // Handle event data
    const { from, to, value } = event.args;
    // Check if the value is greater than 1000 (adjust for token decimals if necessary)
    if (value.lte(ethers.utils.parseUnits("1000", 6))) {
      // If value is less than or equal to 1000, do not execute further logic
      return {
        canExec: false,
        message: `Transfer value ${value} is not greater than 1000`,
      };
    }
    console.log(`Transfer of ${value} USDC from ${from} to ${to} detected`);
  } catch (err) {
    return {
      canExec: false,
      message: `Failed to parse event: ${(err as Error).message}`,
    };
  }

  return { canExec: false, message: `Event processed ${log.transactionHash}` };
});
