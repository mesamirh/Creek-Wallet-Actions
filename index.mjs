import "dotenv/config";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { loadWallets } from "./wallet.mjs";
import {
  connectApi,
  runFaucet,
  swapUsdcToGusd,
  stakeXaum,
  redeemXaum,
  depositSui,
  depositUsdc,
  depositGr,
  borrowGusd,
  repayGusd,
  withdrawSui,
  withdrawUsdc,
  withdrawGr,
  runAll,
} from "./actions.mjs";
import {
  SUI_CLIENT,
  SUI_COIN_TYPE,
  USDC_COIN_TYPE,
  XAUM_COIN_TYPE,
  GUSD_COIN_TYPE,
  GR_COIN_TYPE,
  DEFAULT_SWAP_AMOUNT_USDC,
  DEFAULT_STAKE_AMOUNT_XAUM,
  DEFAULT_REDEEM_AMOUNT_GR,
  DEFAULT_DEPOSIT_AMOUNT_SUI,
  DEFAULT_DEPOSIT_AMOUNT_USDC,
  DEFAULT_DEPOSIT_AMOUNT_GR,
  DEFAULT_BORROW_AMOUNT_GUSD,
  DEFAULT_REPAY_AMOUNT_GUSD,
  DEFAULT_WITHDRAW_AMOUNT_SUI,
  DEFAULT_WITHDRAW_AMOUNT_USDC,
  DEFAULT_WITHDRAW_AMOUNT_GR,
} from "./utils.mjs";
import { getAmountConfig } from "./amount.mjs";
import { log, clearScreen, logInfo } from "./logger.mjs";

// Define all possible actions and their configs
const ACTIONS_CONFIG = {
  connectApi: { name: "1. Connect API (Creek)", fn: connectApi },
  runFaucet: { name: "2. Run Faucet (XAUM & USDC)", fn: runFaucet },
  swapUsdcToGusd: {
    name: "3. Swap USDC to GUSD",
    fn: swapUsdcToGusd,
    getAmount: () =>
      getAmountConfig("USDC", USDC_COIN_TYPE, DEFAULT_SWAP_AMOUNT_USDC),
  },
  stakeXaum: {
    name: "4. Stake XAUM",
    fn: stakeXaum,
    getAmount: () =>
      getAmountConfig("XAUM", XAUM_COIN_TYPE, DEFAULT_STAKE_AMOUNT_XAUM),
  },
  redeemXaum: {
    name: "5. Redeem XAUM (from GR/GY)",
    fn: redeemXaum,
    getAmount: () =>
      getAmountConfig("GR/GY", GR_COIN_TYPE, DEFAULT_REDEEM_AMOUNT_GR),
  },
  depositSui: {
    name: "6. Deposit SUI",
    fn: depositSui,
    getAmount: () =>
      getAmountConfig("SUI", SUI_COIN_TYPE, DEFAULT_DEPOSIT_AMOUNT_SUI),
  },
  depositUsdc: {
    name: "7. Deposit USDC",
    fn: depositUsdc,
    getAmount: () =>
      getAmountConfig("USDC", USDC_COIN_TYPE, DEFAULT_DEPOSIT_AMOUNT_USDC),
  },
  depositGr: {
    name: "8. Deposit GR",
    fn: depositGr,
    getAmount: () =>
      getAmountConfig("GR", GR_COIN_TYPE, DEFAULT_DEPOSIT_AMOUNT_GR),
  },
  borrowGusd: {
    name: "9. Borrow GUSD",
    fn: borrowGusd,
    getAmount: () =>
      getAmountConfig("GUSD", GUSD_COIN_TYPE, DEFAULT_BORROW_AMOUNT_GUSD),
  },
  repayGusd: {
    name: "10. Repay GUSD",
    fn: repayGusd,
    getAmount: () =>
      getAmountConfig("GUSD", GUSD_COIN_TYPE, DEFAULT_REPAY_AMOUNT_GUSD),
  },
  withdrawSui: {
    name: "11. Withdraw SUI",
    fn: withdrawSui,
    getAmount: () =>
      getAmountConfig("SUI", SUI_COIN_TYPE, DEFAULT_WITHDRAW_AMOUNT_SUI),
  },
  withdrawUsdc: {
    name: "12. Withdraw USDC",
    fn: withdrawUsdc,
    getAmount: () =>
      getAmountConfig("USDC", USDC_COIN_TYPE, DEFAULT_WITHDRAW_AMOUNT_USDC),
  },
  withdrawGr: {
    name: "13. Withdraw GR",
    fn: withdrawGr,
    getAmount: () =>
      getAmountConfig("GR", GR_COIN_TYPE, DEFAULT_WITHDRAW_AMOUNT_GR),
  },
};

// A simple helper to pause execution and wait for Enter
async function pressEnterToContinue() {
  log(chalk.inverse("\nPress ENTER to return to the menu..."));
  await inquirer.prompt([
    {
      name: "continue",
      type: "input",
      message: "",
      prefix: "", // Hides the '?' prefix
    },
  ]);
}

async function runSingleAction(wallets, actionKey) {
  const action = ACTIONS_CONFIG[actionKey];
  if (!action) return;

  let config = null;
  if (action.getAmount) {
    config = await action.getAmount();
    if (!config) {
      logInfo("Action cancelled.");
      return;
    }
  }

  log(
    chalk.cyan(`\n--- Running ${action.name} for ${wallets.length} wallets ---`)
  );
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const address = wallet.getPublicKey().toSuiAddress();
    const shortAddr = `0x...${address.slice(-4)}`;
    const spinner = ora(
      `[${i + 1}/${wallets.length}] ${shortAddr} - ${action.name}`
    ).start();

    try {
      if (action.getAmount) {
        await action.fn(wallet, spinner, config);
      } else {
        await action.fn(wallet, spinner);
      }
    } catch (error) {
      // logError is called inside the action, so we just catch to continue
    }
  }
  log(chalk.green.bold(`\n--- ${action.name} complete ---`));
}

async function runMassAction(
  action,
  wallets,
  actionName,
  selectedActions,
  configs
) {
  log(
    chalk.cyan(`\n--- Running ${actionName} for ${wallets.length} wallets ---`)
  );
  const spinner = ora(`Running ${actionName}...`).start();
  try {
    await action(wallets, spinner, selectedActions, configs);
  } catch (error) {
    spinner.fail(chalk.red(`Action failed: ${error.message}`));
    log(chalk.redBright(error.stack));
  }
}

async function handleRunAll(wallets) {
  clearScreen();
  const { selectedActions } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedActions",
      message: "Select actions to run in sequence:",
      choices: Object.entries(ACTIONS_CONFIG).map(([key, value]) => ({
        name: value.name,
        value: key,
      })),
      validate: (input) =>
        input.length > 0 ? true : "Please select at least one action.",
    },
  ]);

  if (selectedActions.length === 0) {
    logInfo("No actions selected.");
    return;
  }

  const configs = {};
  for (const actionKey of selectedActions) {
    const action = ACTIONS_CONFIG[actionKey];
    if (action.getAmount) {
      clearScreen();
      logInfo(`Configuring amount for: ${chalk.yellow(action.name)}`);
      const config = await action.getAmount();
      if (!config) {
        logInfo("Action cancelled.");
        return; // User cancelled one of the prompts
      }
      configs[actionKey] = config;
    }
  }

  clearScreen();
  logInfo("Starting RUN ALL with your selected actions and amounts...");
  await runMassAction(runAll, wallets, "RUN ALL", selectedActions, configs);
}

async function main() {
  let wallets;
  try {
    wallets = loadWallets();
    if (wallets.length === 0) {
      log(chalk.red("No private keys found. Please add PRIVATE_KEYS to .env"));
      return;
    }
  } catch (error) {
    log(chalk.red(`Error loading wallets: ${error.message}`));
    return;
  }

  const menuChoices = [
    ...Object.entries(ACTIONS_CONFIG).map(([key, value]) => ({
      name: value.name,
      value: key,
    })),
    new inquirer.Separator(),
    { name: "RUN ALL (Interactive)", value: "runAll" },
    new inquirer.Separator(),
    { name: "Exit", value: "exit" },
  ];

  while (true) {
    clearScreen();
    logInfo(`Loaded ${wallets.length} wallets.`);

    const firstAddress = wallets[0].getPublicKey().toSuiAddress();
    try {
      const balance = await SUI_CLIENT.getBalance({ owner: firstAddress });
      const suiBalance = (Number(balance.totalBalance) / 10 ** 9).toFixed(4);
      log(
        chalk.gray(
          `First wallet (0x...${firstAddress.slice(
            -4
          )}) SUI Balance: ${suiBalance}`
        )
      );
    } catch (error) {
      log(chalk.red(`Failed to fetch SUI balance: ${error.message}`));
    }

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Select an action to run across all wallets:",
        choices: menuChoices,
      },
    ]);

    if (action === "exit") {
      log(chalk.blue("Exiting."));
      process.exit(0);
    }

    if (action === "runAll") {
      await handleRunAll(wallets);
    } else {
      await runSingleAction(wallets, action);
    }

    await pressEnterToContinue(); // <-- FIX: Using robust wait for Enter
  }
}

main().catch((error) => {
  log(chalk.red(`Unhandled main error: ${error.message}`));
  log(chalk.redBright(error.stack));
  process.exit(1);
});
