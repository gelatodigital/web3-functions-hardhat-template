import {
  Web3Function
} from "@gelatonetwork/web3-functions-sdk";

import { Contract } from "ethers";
import { EvmPriceServiceConnection as EvmPriceServiceConnection2 } from "@pythnetwork/pyth-evm-js";
import PythAbi from "@pythnetwork/pyth-sdk-solidity/abis/IPyth.json";

// web3-functions/pyth-oracle-w3f-priceIds/pythUtils.ts
import { Octokit } from "octokit";
import YAML from "yaml";
import { Price } from "@pythnetwork/pyth-evm-js";

function addLeading0x(id: string) {
  if (id.startsWith("0x")) {
    return id;
  }
  return "0x" + id;
}

function shouldFetchPythConfig(pythConfigStorage: any) {
  const isNotFoundInStorage = pythConfigStorage.pythConfig === void 0;
  return isNotFoundInStorage || Date.now() / 1e3 - pythConfigStorage.timestamp > pythConfigStorage.pythConfig.configRefreshRateInSeconds;
}

async function fetchPythConfigIfNecessary(storage: any, gistId: string) {
  const octokit = new Octokit();
  let pythConfig;
  let pythConfigStorage = JSON.parse(
    await storage.get("pythConfig") ?? "{}"
  );
  if (shouldFetchPythConfig(pythConfigStorage)) {
    const gistDetails = await octokit.rest.gists.get({ gist_id: gistId });
    const files = gistDetails.data.files;
    if (!files)
      throw new Error(`No files in gist`);
    for (const file of Object.values(files)) {
      if (file?.filename === "config.yaml" && file.content) {
        pythConfig = YAML.parse(file.content);
        break;
      }
    }
    if (!pythConfig)
      throw new Error(`No config.yaml loaded for PythConfig`);
    pythConfigStorage = {
      timestamp: Date.now() / 1e3,
      pythConfig
    };
    const pythConfigStorageValue = JSON.stringify(pythConfigStorage);
    if (pythConfig.debug) {
      console.debug(
        `storing fetched pythConfigStorageValue: ${pythConfigStorageValue}`
      );
    }
    await storage.set("pythConfig", pythConfigStorageValue);
  } else {
    pythConfig = pythConfigStorage.pythConfig;
    if (pythConfig.debug) {
      console.debug("using pythConfig from storage");
    }
  }
  return pythConfig;
}
async function getCurrentPrices(priceIds: string[], connection: any, debug: boolean) {
  const latestPriceFeeds = await connection.getLatestPriceFeeds(priceIds);
  if (latestPriceFeeds === void 0) {
    return void 0;
  }
  if (debug) {
    console.debug(`latestPriceFeeds: ${JSON.stringify(latestPriceFeeds)}`);
  }
  return latestPriceFeeds.map((pf: any) => {
    return {
      id: pf.id,
      price: pf.getPriceUnchecked(),
    };
  }).filter((pf: any) => {
    return pf !== void 0 && pf.price !== void 0;
  }).reduce((acc: any, pf: any) => {
    acc.set(addLeading0x(pf.id), pf.price);
    return acc;
  }, /* @__PURE__ */ new Map());
}

async function getLastPrices(priceIds: string[], storage: any) {
  return (await Promise.all(
    priceIds.map(async (priceId) => {
      const storedValue = await storage.get(priceId);
      return { priceId, storedValue };
    })
  )).filter((p) => p.storedValue !== void 0).reduce((acc, priceInfo) => {
    const price = Price.fromJson(JSON.parse(priceInfo.storedValue));
    const expo = priceInfo.storedValue.expo;
    acc.set(priceInfo.priceId, price);
    return acc;
  }, /* @__PURE__ */ new Map());
}

// web3-functions/pyth-oracle-w3f-priceIds/index.ts
Web3Function.onRun(async (context) => {
  const { storage, secrets, multiChainProvider } = context;
  const provider = multiChainProvider.default();
  const gistId = await secrets.get("GIST_ID");

  if (!gistId) {
    return {
      canExec: false,
      message: `GIST_ID not set in secrets`
    };
  }
  let pythConfig;

  // Fetch Pyth config from gist
  try {
    pythConfig = await fetchPythConfigIfNecessary(storage, gistId);
  } catch (err) {
    const error = err;
    return {
      canExec: false,
      message: `Error fetching gist: ${error}`
    };
  }
  const debug = pythConfig.debug;
  if (debug) {
    console.debug(`pythConfig: ${JSON.stringify(pythConfig)}`);
  }

  const {
    pythNetworkAddress,
    priceServiceEndpoint,
    validTimePeriodSeconds,
    deviationThresholdBps,
    priceIds,
    composedDeviationThresholdBps,
    composedPriceIds
  } = pythConfig;
  const pythContract = new Contract(
    pythNetworkAddress,
    PythAbi,
    provider
  );

  const connection = new EvmPriceServiceConnection2(priceServiceEndpoint);
  

  // Add composed PriceFeeds to priceIds
  const allComposedPriceIds: string[] = [];
  const allPriceIds: string[] = []

  if (priceIds) {
    for (const priceId of priceIds) {
      allPriceIds.push(addLeading0x(priceId));
    }
  }

  if (composedPriceIds) {
    for (const composedPriceId of composedPriceIds) {
      for (const priceId of composedPriceId) {
        allComposedPriceIds.push(addLeading0x(priceId));
        if (!allPriceIds.includes(priceId)) {
          allPriceIds.push(addLeading0x(priceId));
        }
      }
    }
  }

  if (debug) {
    console.debug(`fetching current prices for priceIds: ${allPriceIds}`);
  }

  const currentPrices = await getCurrentPrices(allPriceIds, connection, debug);
  
  if (currentPrices === void 0) {
    return {
      canExec: false,
      message: `Error fetching latest priceFeeds for priceIds: ${allPriceIds}`
    };
  }
  if (currentPrices.size != allPriceIds.length) {
    const missingPriceIds = allPriceIds.filter((p) => !currentPrices.has(p));
    console.error(
      `Missing latest price feed info for ${JSON.stringify(missingPriceIds)}`
    );
    return { canExec: false, message: "Not all prices available" };
  }
  const lastPrices = await getLastPrices(allPriceIds, storage);
  
  if (debug) {
    console.debug(
      `
        currentPrices: ${JSON.stringify([...currentPrices.entries()])}
        lastPrices: ${JSON.stringify([...lastPrices.entries()])}
      `
    );
  }

  // Composed price feed needs update
  const composedPriceFeedNeedsUpdate = (composedPriceIds: string[][]) => {
    // Update all oracles if one of them needs update
    let composedLastPrice = 0;
    let composedCurrentPrice = 0;
    let priceIsStale = false;
    for (const priceId of composedPriceIds) {
      // Update the pricefeed if we don't have the last price in storage
      if (lastPrices.get(priceId) === void 0) {
        console.log("Price needs to be loaded into storage")
        return true;
      }
      
      const currentPrice = currentPrices.get(priceId);
      const lastPrice = lastPrices.get(priceId);

      if (composedLastPrice === 0) {
        composedLastPrice = lastPrices.get(priceId).price * (10 ** lastPrices.get(priceId).expo);
      } else {
        composedLastPrice =  composedLastPrice /  (lastPrices.get(priceId).price * (10 ** lastPrices.get(priceId).expo));
      }

      if (composedCurrentPrice === 0) {
        composedCurrentPrice =  currentPrices.get(priceId).price * (10 ** currentPrices.get(priceId).expo);
      } else {
        composedCurrentPrice = composedCurrentPrice /  (currentPrices.get(priceId).price * (10 ** currentPrices.get(priceId).expo));
      }

      

      if (currentPrice.publishTime - lastPrice.publishTime > validTimePeriodSeconds) {
        // Don't need to check for the rest of the oracles or the price difference, we will update anyways
        priceIsStale = true;
        return true;
      }
    }

    let composedPriceDiff = composedLastPrice - composedCurrentPrice;
    composedPriceDiff = composedPriceDiff < 0 ? -composedPriceDiff : composedPriceDiff;
    composedPriceDiff *= 1e4;
    composedPriceDiff /= composedLastPrice;
    const priceExceedsDiff = composedPriceDiff >= composedDeviationThresholdBps;

    if (debug) {
      console.debug(`
        composedPriceId: ${composedPriceIds}
        composedPriceDiff: ${composedPriceDiff}
        priceExceedsDiff: ${priceExceedsDiff}
        priceIsStale: ${priceIsStale}
      `);
    }

    return priceExceedsDiff;
  }

  // Price feed needs update
  const priceFeedNeedsUpdate = (priceId: string) => {
    const lastPrice = lastPrices.get(priceId);
    // Update the pricefeed if we don't have the last price in storage
    if (lastPrice === void 0) {
      return true;
    }
    const currentPrice = currentPrices.get(priceId);
    let priceDiff = BigInt(lastPrice.price) - BigInt(currentPrice.price);
    priceDiff = priceDiff < 0 ? -priceDiff : priceDiff;
    priceDiff *= BigInt(1e4);
    priceDiff /= BigInt(lastPrice.price);

    const priceExceedsDiff = priceDiff >= deviationThresholdBps;
    const priceIsStale = currentPrice.publishTime - lastPrice.publishTime > validTimePeriodSeconds;
    if (debug) {
      console.debug(`
        priceId: ${priceId}
        priceDiff: ${priceDiff}
        priceExceedsDiff: ${priceExceedsDiff}
        priceIsStale: ${priceIsStale}
      `);
    }
    return priceExceedsDiff || priceIsStale;
  };

  const priceIdsToUpdate: string[] = [];

  // Adding composed prices to priceIdsToUpdate
  if (composedPriceIds) {
    for (const composedPriceId of composedPriceIds) {
      if (composedPriceFeedNeedsUpdate(composedPriceId)) {
        for (const priceId of composedPriceId) {
          priceIdsToUpdate.push(priceId);
        }
      }
    }
  }

  // Adding normal prices to priceIdsToUpdate
  if (priceIds) {
    for (const priceId of priceIds) {
      if (priceFeedNeedsUpdate(priceId)) {
        if (!priceIdsToUpdate.includes(priceId)) {
          priceIdsToUpdate.push(priceId);
        }
      }
    }
  }


  if (priceIdsToUpdate.length > 0) {
    await Promise.all(
      priceIdsToUpdate.map(async (priceId) => {
        const storageValue = JSON.stringify(
          currentPrices.get(priceId)?.toJson()
        );
        await storage.set(priceId, storageValue);
      })
    );
    const publishTimes = priceIdsToUpdate.map(
      (priceId) => currentPrices.get(priceId).publishTime
    );
    const updatePriceData = await connection.getPriceFeedsUpdateData(
      priceIdsToUpdate
    );
    const fee = (await pythContract.getUpdateFee(updatePriceData)).toString();
    const callData = await pythContract.interface.encodeFunctionData(
      "updatePriceFeedsIfNecessary",
      [updatePriceData, priceIdsToUpdate, publishTimes]
    );
    return {
      canExec: true,
      callData: [
        {
          to: pythNetworkAddress,
          data: callData,
          value: fee
        }
      ]
    };
  } else {
    return {
      canExec: false,
      message: `No conditions met for price initialization or update for priceIds: ${allPriceIds}`
    };
  }
});