import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";

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
      // 1. Explicitly decode the bech32 string (e.g., "suiprivkey1...")
      // This returns the raw 32-byte secret key.
      const { secretKey } = decodeSuiPrivateKey(key);

      // 2. Create the keypair from the raw 32-byte secret key
      const keypair = Ed25519Keypair.fromSecretKey(secretKey);

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
