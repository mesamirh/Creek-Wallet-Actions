import inquirer from "inquirer";
import chalk from "chalk";
import { SUI_CLIENT, COIN_DECIMALS, SUI_COIN_TYPE } from "./utils.mjs";

// Helper to get total balance for a coin type
export async function getTotalBalance(walletAddress, coinType) {
  if (coinType === SUI_COIN_TYPE) {
    const balance = await SUI_CLIENT.getBalance({ owner: walletAddress });
    return BigInt(balance.totalBalance);
  }

  const { data: coins } = await SUI_CLIENT.getCoins({
    owner: walletAddress,
    coinType: coinType,
  });

  if (!coins || coins.length === 0) {
    return 0n;
  }

  return coins.reduce((acc, coin) => acc + BigInt(coin.balance), 0n);
}

// Asks the user how they want to set the amount
export async function getAmountConfig(coinSymbol, coinType, defaultAmount) {
  const decimals = COIN_DECIMALS.get(coinType) || 9;
  const defaultAmountFloat = Number(defaultAmount) / 10 ** decimals;

  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: `Select amount of ${chalk.yellow(coinSymbol)} to use:`,
      choices: [
        {
          name: `Use Default (${defaultAmountFloat} ${coinSymbol})`,
          value: "default",
        },
        { name: "Use Custom Amount", value: "custom" },
        { name: "Use Full Balance (100%)", value: "percent_100" },
        { name: "Use 50% of Balance", value: "percent_50" },
        { name: "Use 20% of Balance", value: "percent_20" },
        { name: "Use Random % (20-100%)", value: "percent_random" },
        new inquirer.Separator(),
        { name: "Cancel", value: "cancel" },
      ],
    },
  ]);

  if (mode === "cancel") return null;

  if (mode === "custom") {
    const { customAmount } = await inquirer.prompt([
      {
        type: "input",
        name: "customAmount",
        message: `Enter amount of ${coinSymbol}:`,
        validate: (input) => {
          const val = parseFloat(input);
          if (isNaN(val) || val <= 0) {
            return "Please enter a valid positive number.";
          }
          return true;
        },
      },
    ]);
    return { mode: "custom", value: parseFloat(customAmount) };
  }

  if (mode.startsWith("percent")) {
    const [_, type] = mode.split("_");
    let value = 1.0;
    if (type === "50") value = 0.5;
    if (type === "20") value = 0.2;
    if (type === "random") {
      value = Math.random() * 0.8 + 0.2; // Random float between 0.2 and 1.0
    }
    return { mode: "percent", value: value };
  }

  // Default mode
  return { mode: "default", value: defaultAmount };
}

// Calculates the final BigInt amount based on the config
export async function calculateAmount(walletAddress, coinType, config) {
  if (config.mode === "default") {
    return config.value;
  }

  const decimals = COIN_DECIMALS.get(coinType) || 9;
  const balance = await getTotalBalance(walletAddress, coinType);

  if (balance === 0n) {
    return 0n;
  }

  if (config.mode === "custom") {
    const customAmount = BigInt(Math.floor(config.value * 10 ** decimals));
    // Don't let custom amount exceed balance
    return customAmount > balance ? balance : customAmount;
  }

  if (config.mode === "percent") {
    // Perform multiplication before division to maintain precision with BigInt
    // (balance * percentage_value_numerator) / percentage_value_denominator
    // e.g., for 50% (value = 0.5), we do (balance * 50n) / 100n
    const percentage = BigInt(Math.floor(config.value * 100));
    let amount = (balance * percentage) / 100n;

    // For SUI, leave a small amount (0.01 SUI) for gas
    if (coinType === SUI_COIN_TYPE) {
      const gasReserve = 10000000n; // 0.01 SUI
      if (amount > balance - gasReserve) {
        amount = balance - gasReserve;
      }
    }

    // Ensure amount is not negative
    return amount < 0n ? 0n : amount;
  }

  return 0n;
}
