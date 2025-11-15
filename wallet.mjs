import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { fromHEX } from "@mysten/sui.js/utils";

/**
 * Parses a private key from either Bech32 (suiprivkey...) or Hex (0x...) format.
 * @param {string} key
 * @returns {Uint8Array} The 32-byte secret key.
 */
function parsePrivateKey(key) {
  // 1. Check for Bech32 format (suiprivkey1...)
  if (key.startsWith("suiprivkey1")) {
    try {
      const { secretKey } = decodeSuiPrivateKey(key);
      return secretKey;
    } catch (e) {
      throw new Error(`Failed to decode suiprivkey: ${e.message}`);
    }
  }

  // 2. Check for Hex format (0x... or just hex)
  let hexKey = key;
  if (key.startsWith("0x")) {
    hexKey = key.substring(2);
  }

  if (hexKey.length === 64 && /^[0-9a-fA-F]+$/.test(hexKey)) {
    try {
      const secretKey = fromHEX(hexKey);
      if (secretKey.length !== 32) {
        throw new Error(
          `Hex key decoded to ${secretKey.length} bytes, expected 32.`
        );
      }
      return secretKey;
    } catch (e) {
      throw new Error(`Failed to decode hex key: ${e.message}`);
    }
  }

  // 3. If neither, throw an error
  throw new Error(
    "Invalid private key format. Must be Bech32 (suiprivkey...) or 64-char Hex (0x...)."
  );
}

export function loadWallets() {
  const privateKeysEnv = process.env.PRIVATE_KEYS;
  if (!privateKeysEnv) {
    console.warn(
      "PRIVATE_KEYS environment variable is not set. No wallets loaded."
    );
    return [];
  }

  const privateKeys = privateKeysEnv
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const wallets = [];
  for (const key of privateKeys) {
    try {
      // 1. Parse the key string (Bech32 or Hex) to get raw 32 bytes
      const secretKeyBytes = parsePrivateKey(key);

      // 2. Create the keypair from the raw 32-byte secret key
      const keypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);

      wallets.push(keypair);
    } catch (error) {
      console.error(
        `Failed to load wallet from private key "${key.substring(0, 10)}...": ${
          error.message
        }`
      );
    }
  }

  return wallets;
}
