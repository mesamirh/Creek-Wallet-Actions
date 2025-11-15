import { TransactionBlock } from "@mysten/sui.js/transactions";
import chalk from "chalk";
import ora from "ora";
import {
  SUI_CLIENT,
  CREEK_API_URL,
  CLOCK_ID,
  PROTOCOL_PKG_ID,
  SUI_COIN_TYPE,
  XAUM_PKG_ID,
  XAUM_COIN_TYPE,
  USDC_PKG_ID,
  USDC_COIN_TYPE,
  GUSD_PKG_ID,
  GUSD_COIN_TYPE,
  GR_PKG_ID,
  GR_COIN_TYPE,
  GY_PKG_ID,
  GY_COIN_TYPE,
  XAUM_MINT_CAP,
  FAUCET_XAUM_AMOUNT,
  USDC_TREASURY,
  FAUCET_USDC_AMOUNT,
  SWAP_USDC_VAULT_ID,
  STAKING_MANAGER_ID,
  LENDING_MARKET_ID,
  LENDING_VERSION_ID,
  LENDING_COIN_DECIMALS_REGISTRY_ID,
  LENDING_X_ORACLE_ID,
  LENDING_X_ORACLE_PKG_ID,
  LENDING_MANUAL_RULE_PKG_ID,
  COIN_DECIMALS,
} from "./utils.mjs";
import { log, logSuccess, logError } from "./logger.mjs";
import { calculateAmount, getTotalBalance } from "./amount.mjs";

// --- Helper Functions ---

async function executeTransaction(wallet, txb, spinner, actionName) {
  const address = wallet.getPublicKey().toSuiAddress();
  try {
    const result = await SUI_CLIENT.signAndExecuteTransactionBlock({
      signer: wallet,
      transactionBlock: txb,
      options: {
        showEffects: true,
      },
      requestType: "WaitForLocalExecution",
    });

    if (result.effects?.status.status === "success") {
      logSuccess(spinner, address, actionName, result.digest);
    } else {
      throw new Error(
        `Transaction failed: ${result.effects?.status.error || "Unknown error"}`
      );
    }
    return result;
  } catch (error) {
    logError(spinner, address, actionName, error);
    throw error;
  }
}

async function postCreekApi(endpoint, payload, spinner, actionName) {
  const address = payload.walletAddress;
  try {
    const response = await fetch(`${CREEK_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      logSuccess(spinner, address, actionName, data.msg || "OK");
      return data;
    } else {
      throw new Error(
        `API error (${data.code}): ${data.msg || "Unknown error"}`
      );
    }
  } catch (error) {
    logError(spinner, address, actionName, error);
    throw error;
  }
}

async function getCoins(walletAddress, coinType, txb, amount) {
  const { data: coins } = await SUI_CLIENT.getCoins({
    owner: walletAddress,
    coinType: coinType,
  });

  if (!coins || coins.length === 0) {
    throw new Error(`No ${coinType} coins found.`);
  }

  const totalBalance = coins.reduce(
    (acc, coin) => acc + BigInt(coin.balance),
    0n
  );

  if (totalBalance < amount) {
    throw new Error(
      `Insufficient ${coinType} balance. Need ${amount}, have ${totalBalance}`
    );
  }

  const [primaryCoin, ...otherCoins] = coins.map((c) => c.coinObjectId);
  const primaryCoinRef = txb.object(primaryCoin);

  if (otherCoins.length > 0) {
    txb.mergeCoins(
      primaryCoinRef,
      otherCoins.map((c) => txb.object(c))
    );
  }

  const [splitCoin] = txb.splitCoins(primaryCoinRef, [txb.pure(amount)]);
  // Return the split coin for the transaction AND the remaining merged coin
  return [splitCoin, primaryCoinRef];
}

async function getObligation(walletAddress) {
  const { data } = await SUI_CLIENT.getOwnedObjects({
    owner: walletAddress,
    filter: {
      StructType: `${PROTOCOL_PKG_ID}::obligation::ObligationKey`,
    },
    options: { showContent: true, showType: true },
  });

  if (data && data.length > 0) {
    const obligationKey = data[0];
    if (
      obligationKey.data?.content?.dataType === "moveObject" &&
      obligationKey.data.content.fields.ownership
    ) {
      const ownership = obligationKey.data.content.fields.ownership;
      const obligationId =
        ownership.fields.owner_object_id || ownership.fields.of;
      if (obligationId) {
        return {
          obligationId: obligationId,
          obligationKeyId: obligationKey.data.objectId,
          hasExistingObligation: true,
        };
      }
    }
  }

  return {
    obligationId: null,
    obligationKeyId: null,
    hasExistingObligation: false,
  };
}

async function addOracleUpdate(txb, coinType) {
  const priceRequest = txb.moveCall({
    target: `${LENDING_X_ORACLE_PKG_ID}::x_oracle::price_update_request`,
    typeArguments: [coinType],
    arguments: [txb.object(LENDING_X_ORACLE_ID)],
  });

  txb.moveCall({
    target: `${LENDING_MANUAL_RULE_PKG_ID}::rule::set_price_as_primary`,
    typeArguments: [coinType],
    arguments: [priceRequest, txb.pure(1n), txb.object(CLOCK_ID)],
  });

  txb.moveCall({
    target: `${LENDING_X_ORACLE_PKG_ID}::x_oracle::confirm_price_update_request`,
    typeArguments: [coinType],
    arguments: [
      txb.object(LENDING_X_ORACLE_ID),
      priceRequest,
      txb.object(CLOCK_ID),
    ],
  });
}

// --- Action Functions ---

export async function connectApi(wallet, spinner) {
  const address = wallet.getPublicKey().toSuiAddress();
  await postCreekApi(
    "/api/user/connect",
    { walletAddress: address },
    spinner,
    "Connect API"
  );
}

export async function runFaucet(wallet, spinner) {
  const address = wallet.getPublicKey().toSuiAddress();
  spinner.text = `[0x...${address.slice(-4)}] Running XAUM & USDC Faucet...`;

  let txbXaum = new TransactionBlock();
  txbXaum.moveCall({
    target: `${XAUM_PKG_ID}::coin_xaum::mint`,
    arguments: [
      txbXaum.object(XAUM_MINT_CAP),
      txbXaum.pure(FAUCET_XAUM_AMOUNT),
      txbXaum.pure(address),
    ],
  });
  await executeTransaction(wallet, txbXaum, spinner, "XAUM Faucet");

  let txbUsdc = new TransactionBlock();
  txbUsdc.moveCall({
    target: `${USDC_PKG_ID}::usdc::mint`,
    arguments: [
      txbUsdc.object(USDC_TREASURY),
      txbUsdc.pure(FAUCET_USDC_AMOUNT),
      txbUsdc.pure(address),
    ],
  });
  await executeTransaction(wallet, txbUsdc, spinner, "USDC Faucet");
}

export async function swapUsdcToGusd(wallet, spinner, config) {
  const address = wallet.getPublicKey().toSuiAddress();
  const amount = await calculateAmount(address, USDC_COIN_TYPE, config);
  const decimals = COIN_DECIMALS.get(USDC_COIN_TYPE);

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] Swap USDC: Skipping, 0 balance or amount.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Swapping ${
    Number(amount) / 10 ** decimals
  } USDC...`;

  const txb = new TransactionBlock();
  const [usdcCoin, mainUsdcCoin] = await getCoins(
    address,
    USDC_COIN_TYPE,
    txb,
    amount
  );

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::gusd_usdc_vault::mint_gusd`,
    arguments: [
      txb.object(SWAP_USDC_VAULT_ID),
      txb.object(LENDING_MARKET_ID),
      usdcCoin,
      txb.object(CLOCK_ID),
    ],
  });

  txb.transferObjects([mainUsdcCoin], txb.pure(address));
  await executeTransaction(wallet, txb, spinner, "Swap USDC->GUSD");
}

export async function stakeXaum(wallet, spinner, config) {
  const address = wallet.getPublicKey().toSuiAddress();
  const amount = await calculateAmount(address, XAUM_COIN_TYPE, config);
  const decimals = COIN_DECIMALS.get(XAUM_COIN_TYPE);

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] Stake XAUM: Skipping, 0 balance or amount.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Staking ${
    Number(amount) / 10 ** decimals
  } XAUM...`;

  const txb = new TransactionBlock();
  const [xaumCoin, mainXaumCoin] = await getCoins(
    address,
    XAUM_COIN_TYPE,
    txb,
    amount
  );

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::staking_manager::stake_xaum`,
    arguments: [txb.object(STAKING_MANAGER_ID), xaumCoin],
  });

  txb.transferObjects([mainXaumCoin], txb.pure(address));
  await executeTransaction(wallet, txb, spinner, "Stake XAUM");
}

export async function redeemXaum(wallet, spinner, config) {
  const address = wallet.getPublicKey().toSuiAddress();

  const grBalance = await getTotalBalance(address, GR_COIN_TYPE);
  const gyBalance = await getTotalBalance(address, GY_COIN_TYPE);
  const minBalance = grBalance < gyBalance ? grBalance : gyBalance;

  let amount = 0n;
  const decimals = COIN_DECIMALS.get(GR_COIN_TYPE);

  if (minBalance === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] Redeem: Skipping, no GR/GY pairs found.`
      )
    );
    return;
  }

  if (config.mode === "default") {
    amount = config.value > minBalance ? minBalance : config.value;
  } else if (config.mode === "custom") {
    const customAmount = BigInt(Math.floor(config.value * 10 ** decimals));
    amount = customAmount > minBalance ? minBalance : customAmount;
  } else if (config.mode === "percent") {
    const percentage = BigInt(Math.floor(config.value * 100));
    amount = (minBalance * percentage) / 100n;
  }

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] Redeem: Skipping, 0 amount calculated.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Redeeming ${
    Number(amount) / 10 ** decimals
  } GR & GY...`;

  const txb = new TransactionBlock();
  const [grCoin, mainGrCoin] = await getCoins(
    address,
    GR_COIN_TYPE,
    txb,
    amount
  );
  const [gyCoin, mainGyCoin] = await getCoins(
    address,
    GY_COIN_TYPE,
    txb,
    amount
  );

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::staking_manager::unstake`,
    arguments: [txb.object(STAKING_MANAGER_ID), grCoin, gyCoin],
  });

  txb.transferObjects([mainGrCoin, mainGyCoin], txb.pure(address));
  await executeTransaction(wallet, txb, spinner, "Redeem XAUM");
}

async function deposit(wallet, spinner, coinType, config, actionName) {
  const address = wallet.getPublicKey().toSuiAddress();
  const amount = await calculateAmount(address, coinType, config);
  const decimals = COIN_DECIMALS.get(coinType);

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(
          -4
        )}] ${actionName}: Skipping, 0 balance or amount.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Depositing ${
    Number(amount) / 10 ** decimals
  } ${actionName.split(" ")[1]}...`;

  let { obligationId, hasExistingObligation } = await getObligation(address);

  const txb = new TransactionBlock();
  let coinToDeposit;
  let mainCoinToReturn = [];

  if (coinType === SUI_COIN_TYPE) {
    const [suiCoin] = txb.splitCoins(txb.gas, [txb.pure(amount)]);
    coinToDeposit = suiCoin;
  } else {
    const [splitCoin, mainCoin] = await getCoins(
      address,
      coinType,
      txb,
      amount
    );
    coinToDeposit = splitCoin;
    mainCoinToReturn.push(mainCoin);
  }

  let obligationRef;
  let obligationHotPotato;

  if (!hasExistingObligation) {
    const [obligation, obligationKey, hotPotato] = txb.moveCall({
      target: `${PROTOCOL_PKG_ID}::open_obligation::open_obligation`,
      arguments: [txb.object(LENDING_VERSION_ID)],
    });
    obligationRef = obligation;
    obligationHotPotato = hotPotato;
    txb.transferObjects([obligationKey], txb.pure(address));
  } else {
    obligationRef = txb.object(obligationId);
  }

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::deposit_collateral::deposit_collateral`,
    typeArguments: [coinType],
    arguments: [
      txb.object(LENDING_VERSION_ID),
      obligationRef,
      txb.object(LENDING_MARKET_ID),
      coinToDeposit,
    ],
  });

  if (!hasExistingObligation) {
    txb.moveCall({
      target: `${PROTOCOL_PKG_ID}::open_obligation::return_obligation`,
      arguments: [
        txb.object(LENDING_VERSION_ID),
        obligationRef,
        obligationHotPotato,
      ],
    });
  }

  if (mainCoinToReturn.length > 0) {
    txb.transferObjects(mainCoinToReturn, txb.pure(address));
  }

  await executeTransaction(wallet, txb, spinner, actionName);
}

export async function depositSui(wallet, spinner, config) {
  await deposit(wallet, spinner, SUI_COIN_TYPE, config, "Deposit SUI");
}

export async function depositUsdc(wallet, spinner, config) {
  await deposit(wallet, spinner, USDC_COIN_TYPE, config, "Deposit USDC");
}

export async function depositGr(wallet, spinner, config) {
  await deposit(wallet, spinner, GR_COIN_TYPE, config, "Deposit GR");
}

export async function borrowGusd(wallet, spinner, config) {
  const address = wallet.getPublicKey().toSuiAddress();
  const decimals = COIN_DECIMALS.get(GUSD_COIN_TYPE);
  let amount = 0n;

  if (config.mode === "default") {
    amount = config.value;
  } else if (config.mode === "custom") {
    amount = BigInt(Math.floor(config.value * 10 ** decimals));
  } else {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(
          -4
        )}] Borrow: Percentage not supported, using default.`
      )
    );
    amount = config.value;
  }

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] Borrow GUSD: Skipping, 0 amount.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Borrowing ${
    Number(amount) / 10 ** decimals
  } GUSD...`;

  const { obligationId, obligationKeyId, hasExistingObligation } =
    await getObligation(address);

  if (!hasExistingObligation) {
    throw new Error("No obligation found. Please deposit collateral first.");
  }

  const txb = new TransactionBlock();
  await addOracleUpdate(txb, SUI_COIN_TYPE);
  await addOracleUpdate(txb, USDC_COIN_TYPE);
  await addOracleUpdate(txb, GR_COIN_TYPE);
  await addOracleUpdate(txb, GUSD_COIN_TYPE);

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::borrow::borrow_entry`,
    // NO typeArguments here - this was the bug fix
    arguments: [
      txb.object(LENDING_VERSION_ID),
      txb.object(obligationId),
      txb.object(obligationKeyId),
      txb.object(LENDING_MARKET_ID),
      txb.object(LENDING_COIN_DECIMALS_REGISTRY_ID),
      txb.pure(amount),
      txb.object(LENDING_X_ORACLE_ID),
      txb.object(CLOCK_ID),
    ],
  });

  await executeTransaction(wallet, txb, spinner, "Borrow GUSD");
}

export async function repayGusd(wallet, spinner, config) {
  const address = wallet.getPublicKey().toSuiAddress();
  const amount = await calculateAmount(address, GUSD_COIN_TYPE, config);
  const decimals = COIN_DECIMALS.get(GUSD_COIN_TYPE);

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] Repay GUSD: Skipping, 0 balance or amount.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Repaying ${
    Number(amount) / 10 ** decimals
  } GUSD...`;

  const { obligationId, hasExistingObligation } = await getObligation(address);
  if (!hasExistingObligation) {
    throw new Error("No obligation found.");
  }

  const txb = new TransactionBlock();
  const [gusdCoin, mainGusdCoin] = await getCoins(
    address,
    GUSD_COIN_TYPE,
    txb,
    amount
  );

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::repay::repay`,
    typeArguments: [GUSD_COIN_TYPE],
    arguments: [
      txb.object(LENDING_VERSION_ID),
      txb.object(obligationId),
      txb.object(LENDING_MARKET_ID),
      gusdCoin,
      txb.object(CLOCK_ID),
    ],
  });

  txb.transferObjects([mainGusdCoin], txb.pure(address));
  await executeTransaction(wallet, txb, spinner, "Repay GUSD");
}

async function withdraw(wallet, spinner, coinType, config, actionName) {
  const address = wallet.getPublicKey().toSuiAddress();
  const decimals = COIN_DECIMALS.get(coinType);
  let amount = 0n;

  if (config.mode === "default") {
    amount = config.value;
  } else if (config.mode === "custom") {
    amount = BigInt(Math.floor(config.value * 10 ** decimals));
  } else {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(
          -4
        )}] ${actionName}: Percentage not supported, using default.`
      )
    );
    amount = config.value;
  }

  if (amount === 0n) {
    spinner.warn(
      chalk.yellow(
        `[0x...${address.slice(-4)}] ${actionName}: Skipping, 0 amount.`
      )
    );
    return;
  }

  spinner.text = `[0x...${address.slice(-4)}] Withdrawing ${
    Number(amount) / 10 ** decimals
  } ${actionName.split(" ")[1]}...`;

  const { obligationId, obligationKeyId, hasExistingObligation } =
    await getObligation(address);

  if (!hasExistingObligation) {
    throw new Error("No obligation found. Cannot withdraw.");
  }

  const txb = new TransactionBlock();
  await addOracleUpdate(txb, SUI_COIN_TYPE);
  await addOracleUpdate(txb, USDC_COIN_TYPE);
  await addOracleUpdate(txb, GR_COIN_TYPE);
  await addOracleUpdate(txb, GUSD_COIN_TYPE);

  txb.moveCall({
    target: `${PROTOCOL_PKG_ID}::withdraw_collateral::withdraw_collateral_entry`,
    typeArguments: [coinType],
    arguments: [
      txb.object(LENDING_VERSION_ID),
      txb.object(obligationId),
      txb.object(obligationKeyId),
      txb.object(LENDING_MARKET_ID),
      txb.object(LENDING_COIN_DECIMALS_REGISTRY_ID),
      txb.pure(amount),
      txb.object(LENDING_X_ORACLE_ID),
      txb.object(CLOCK_ID),
    ],
  });

  await executeTransaction(wallet, txb, spinner, actionName);
}

export async function withdrawSui(wallet, spinner, config) {
  await withdraw(wallet, spinner, SUI_COIN_TYPE, config, "Withdraw SUI");
}

export async function withdrawUsdc(wallet, spinner, config) {
  await withdraw(wallet, spinner, USDC_COIN_TYPE, config, "Withdraw USDC");
}

export async function withdrawGr(wallet, spinner, config) {
  await withdraw(wallet, spinner, GR_COIN_TYPE, config, "Withdraw GR");
}

// --- RUN ALL (Interactive) ---
const allActions = {
  connectApi: { fn: connectApi, name: "Connect API", needsConfig: false },
  runFaucet: {
    fn: runFaucet,
    name: "Faucet (XAUM & USDC)",
    needsConfig: false,
  },
  swapUsdcToGusd: {
    fn: swapUsdcToGusd,
    name: "Swap USDC->GUSD",
    needsConfig: true,
  },
  stakeXaum: { fn: stakeXaum, name: "Stake XAUM", needsConfig: true },
  depositSui: { fn: depositSui, name: "Deposit SUI", needsConfig: true },
  depositUsdc: { fn: depositUsdc, name: "Deposit USDC", needsConfig: true },
  depositGr: { fn: depositGr, name: "Deposit GR", needsConfig: true },
  borrowGusd: { fn: borrowGusd, name: "Borrow GUSD", needsConfig: true },
  repayGusd: { fn: repayGusd, name: "Repay GUSD", needsConfig: true },
  withdrawSui: { fn: withdrawSui, name: "Withdraw SUI", needsConfig: true },
  withdrawUsdc: { fn: withdrawUsdc, name: "Withdraw USDC", needsConfig: true },
  withdrawGr: { fn: withdrawGr, name: "Withdraw GR", needsConfig: true },
  redeemXaum: {
    fn: redeemXaum,
    name: "Redeem XAUM (Cleanup)",
    needsConfig: true,
  },
};

export async function runAll(
  wallets,
  mainSpinner,
  selectedActionKeys,
  configs
) {
  mainSpinner.text = "Running selected actions...";
  mainSpinner.stop();

  const actionsToRun = selectedActionKeys.map((key) => ({
    key,
    ...allActions[key],
  }));

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const address = wallet.getPublicKey().toSuiAddress();
    log(
      chalk.cyan(
        `\n--- Processing Wallet ${i + 1}/${wallets.length} (${address}) ---`
      )
    );

    for (const action of actionsToRun) {
      const shortAddr = `0x...${address.slice(-4)}`;
      const actionSpinner = ora(`[${shortAddr}] ${action.name}...`).start(); // <-- This line was the error
      try {
        if (action.needsConfig) {
          await action.fn(wallet, actionSpinner, configs[action.key]);
        } else {
          await action.fn(wallet, actionSpinner);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // Error is already logged by logError, just log a separator
        log(chalk.red(` `));
      }
    }
  }

  mainSpinner.succeed("All selected actions completed for all wallets.");
}
