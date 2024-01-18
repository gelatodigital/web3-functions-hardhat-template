# Web3 Event Listener and Webhook Notifier

This project sets up a Web3 function to listen for specific smart contract events and sends a notification to a configured webhook URL when those events occur.

## Features

- **Dynamic Event Subscription**: Subscribe to any smart contract event on the Ethereum blockchain.
- **Webhook Notification**: Automatically sends event details to a specified webhook URL when an event is triggered.
- **Flexibility**: Can be configured to listen for various events from any smart contract.
- **Ease of Use**: Designed to be simple to set up with user-defined parameters.

## Configuration

Before deploying the Web3 function, configure your listener by providing the following parameters in `userArgs`:

```json
{
  "target": "<SMART_CONTRACT_ADDRESS>",
  "event": "<EVENT_ABI_SIGNATURE>",
  "eventTopic": "<EVENT_NAME>",
  "filter": "<ADDRESS_TO_FILTER>",
  "webhookUrl": "<YOUR_WEBHOOK_URL>"
}
```

Replace placeholders with your target contract address, the event ABI signature, the specific event name to listen for, the address to filter events from (if applicable), and your webhook URL to receive notifications.

## Deployment

Deploy the Web3 function to the Gelato Network with the following TypeScript function:

```
yarn hardhat run .\scripts\create-task-event-filter.ts --network mumbai
```

```
Deploying Web3Function on IPFS...
Web3Function IPFS CID: QmcL6e6SJbw71ZGoGABraaRXwCXQaAUR2pAeXix9c3SdNB
Creating automate task...
event Transfer(address indexed from, address indexed to, uint256 value)
Task created, taskId: 0x78b3284575d89ae202ed7dfeda4dfbfc62d15e604b9c0d1e33982b8132e69afa (tx hash: 0x2ac352dbe7abe3ca30f6ef08d70f5da530cd019a089085377af23afaf5193105)
> https://beta.app.gelato.network/task/0x78b3284575d89ae202ed7dfeda4dfbfc62d15e604b9c0d1e33982b8132e69afa?chainId=80001
Done in 18.49s.
```

## Usage

Once the setup is complete, the listener will monitor for the specified event. When an event occurs that matches the filter criteria, it will send a POST request to your webhook URL with details such as the event name, its arguments, and the transaction hash.

[Task for listening USDC transfers](https://app.gelato.network/functions/task/0x78b3284575d89ae202ed7dfeda4dfbfc62d15e604b9c0d1e33982b8132e69afa:80001)
