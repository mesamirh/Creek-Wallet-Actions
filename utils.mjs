import { SuiClient } from "@mysten/sui.js/client";

// --- Client and API ---
export const RPC_URL = "https://sui-testnet-rpc.publicnode.com/";
export const SUI_CLIENT = new SuiClient({ url: RPC_URL });
export const CREEK_API_URL = "https://api-test.creek.finance";

// --- System Objects ---
export const CLOCK_ID = "0x6";

// --- Protocol Packages ---
export const PROTOCOL_PKG_ID =
  "0x8cee41afab63e559bc236338bfd7c6b2af07c9f28f285fc8246666a7ce9ae97a";

// --- Coin Types ---
export const SUI_COIN_TYPE = "0x2::sui::SUI";

export const XAUM_PKG_ID =
  "0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b";
export const XAUM_COIN_TYPE = `${XAUM_PKG_ID}::coin_xaum::COIN_XAUM`;

export const USDC_PKG_ID =
  "0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b";
export const USDC_COIN_TYPE = `${USDC_PKG_ID}::usdc::USDC`;

export const GUSD_PKG_ID =
  "0x5434351f2dcae30c0c4b97420475c5edc966b02fd7d0bbe19ea2220d2f623586";
export const GUSD_COIN_TYPE = `${GUSD_PKG_ID}::coin_gusd::COIN_GUSD`;

export const GR_PKG_ID =
  "0x5504354cf3dcbaf64201989bc734e97c1d89bba5c7f01ff2704c43192cc2717c";
export const GR_COIN_TYPE = `${GR_PKG_ID}::coin_gr::COIN_GR`;

export const GY_PKG_ID =
  "0x0ac2d5ebd2834c0db725eedcc562c60fa8e281b1772493a4d199fd1e70065671";
export const GY_COIN_TYPE = `${GY_PKG_ID}::coin_gy::COIN_GY`;

// --- Coin Decimals ---
export const COIN_DECIMALS = new Map([
  [SUI_COIN_TYPE, 9],
  [USDC_COIN_TYPE, 9],
  [XAUM_COIN_TYPE, 9],
  [GUSD_COIN_TYPE, 9],
  [GR_COIN_TYPE, 9],
  [GY_COIN_TYPE, 9],
]);

// --- Faucet (Default Amounts) ---
export const FAUCET_XAUM_AMOUNT = 1000000000n; // 1 XAUM
export const FAUCET_USDC_AMOUNT = 10000000000n; // 10 USDC
export const XAUM_MINT_CAP =
  "0x66984752afbd878aaee450c70142747bb31fca2bb63f0a083d75c361da39adb1";
export const USDC_TREASURY =
  "0x77153159c4e3933658293a46187c30ef68a8f98aa48b0ce76ffb0e6d20c0776b";

// --- Lending Objects ---
export const LENDING_MARKET_ID =
  "0x166dd68901d2cb47b55c7cfbb7182316f84114f9e12da9251fd4c4f338e37f5d";
export const LENDING_VERSION_ID =
  "0x13f4679d0ebd6fc721875af14ee380f45cde02f81d690809ac543901d66f6758";
export const LENDING_COIN_DECIMALS_REGISTRY_ID =
  "0x3a865c5bc0e47efc505781598396d75b647e4f1218359e89b08682519c3ac060";
export const LENDING_X_ORACLE_ID =
  "0x9052b77605c1e2796582e996e0ce60e2780c9a440d8878a319fa37c50ca32530";
export const LENDING_QUERY_PKG_ID =
  "0x4d1f33ee71128c75472eca1b1ad84cc66f1df6257bbba820eb382c1865aa4ab9";
export const LENDING_X_ORACLE_PKG_ID =
  "0xca9b2f66c5ab734939e048d0732e2a09f486402bb009d88f95c27abe8a4872ee";
export const LENDING_MANUAL_RULE_PKG_ID =
  "0xbd6d8bb7f40ca9921d0c61404cba6dcfa132f184cf8c0f273008a103889eb0e8";

// --- Default Action Amounts ---
export const SWAP_USDC_VAULT_ID =
  "0x1fc1b07f7c1d06d4d8f0b1d0a2977418ad71df0d531c476273a2143dfeffba0e";
export const DEFAULT_SWAP_AMOUNT_USDC = 1000000000n; // 1 USDC

export const STAKING_MANAGER_ID =
  "0x5c9d26e8310f740353eac0e67c351f71bad8748cf5ac90305ffd32a5f3326990";
export const DEFAULT_STAKE_AMOUNT_XAUM = 1000000000n; // 1 XAUM

export const DEFAULT_REDEEM_AMOUNT_GR = 100000000000n; // 100 GR
export const DEFAULT_REDEEM_AMOUNT_GY = 100000000000n; // 100 GY

export const DEFAULT_DEPOSIT_AMOUNT_SUI = 10000000n; // 0.01 SUI
export const DEFAULT_DEPOSIT_AMOUNT_USDC = 1000000000n; // 1 USDC
export const DEFAULT_DEPOSIT_AMOUNT_GR = 1000000000n; // 1 GR
export const DEFAULT_BORROW_AMOUNT_GUSD = 5000000000n; // 5 GUSD
export const DEFAULT_REPAY_AMOUNT_GUSD = 5000000001n; // 5.000000001 GUSD
export const DEFAULT_WITHDRAW_AMOUNT_SUI = 10000000n; // 0.01 SUI
export const DEFAULT_WITHDRAW_AMOUNT_USDC = 1000000000n; // 1 USDC
export const DEFAULT_WITHDRAW_AMOUNT_GR = 1000000000n; // 1 GR
