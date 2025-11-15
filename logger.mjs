import chalk from "chalk";

const log = console.log;

function getShortAddress(address) {
  return `0x...${address.slice(-4)}`;
}

function getShortHash(hash) {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
}

export function clearScreen() {
  console.clear();
}

export function logInfo(message) {
  log(chalk.blue(message));
}

export function logSuccess(spinner, address, actionName, txDigest) {
  const shortAddr = getShortAddress(address);
  const shortHash =
    actionName === "Connect API" ? "" : `: ${getShortHash(txDigest)}`;

  spinner.succeed(
    chalk.green.bold(`✔ [${shortAddr}] ${actionName} success${shortHash}`)
  );
}

export function logError(spinner, address, actionName, error) {
  const shortAddr = getShortAddress(address);
  spinner.fail(
    chalk.red.bold(`✖ [${shortAddr}] ${actionName} failed: ${error.message}`)
  );
}

export { log };
