import {
  Web3Function,
  Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "@ethersproject/contracts";
import { Interface } from "@ethersproject/abi";
import { ethers } from "ethers";
import axios from "axios";
import { latestBlock } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";

const MAX_RANGE = 100; // limit range of events to comply with rpc providers

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
  const { multiChainProvider, log } = context;

  // USDT Contract Address and ABI for Transfer event
  const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Replace with the correct address if different
  const USDT_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ];
  const provider = multiChainProvider.chainId(1);

  // Initialize USDT contract
  const usdtContract = new Contract(USDT_ADDRESS, USDT_ABI, provider);

  // Create an interface for the ABI to decode logs
  const iface = new Interface(USDT_ABI);

  const latestBlock = await provider.getBlockNumber();

  // Define event filter for Transfer event
  const filter = {
    address: usdtContract.address,
    topics: [iface.getEventTopic("Transfer")],
    fromBlock: latestBlock - MAX_RANGE,
    toBlock: latestBlock,
  };

  const logs = await provider.getLogs(filter);
  for (const log of logs) {
    const parsedLog = iface.parseLog(log);
    const amount = parsedLog.args.value;

    // Check if the transfer amount is greater than 1000 USDT
    if (amount.gt(ethers.utils.parseUnits("1000", 6))) {
      // USDT has 6 decimal places
      try {
        // Make an API call to the specified webhook URL with the event data
        // const response = await axios.post(userArgs.webHookUrl as string, {
        //   data: parsedLog,
        // });
        console.log("API call successful");
      } catch (error) {
        console.error("API call failed:", error);
      }
    }
  }

  return { canExec: false, message: `Event processed}` };
});
