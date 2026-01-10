import "dotenv/config";
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

const HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet (per Polymarket docs)

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const privateKey = requireEnv("PRIVATE_KEY");
  const signer = new Wallet(privateKey);

  // L1 client (no apiCreds yet)
  const client = new ClobClient(HOST, CHAIN_ID, signer);

  /**
   * Option A (common): derive API credentials from your wallet
   * Polymarket docs show deriveApiKey() returning { key, secret, passphrase }.
   */
  const derived = await client.deriveApiKey();

  console.log("=== DERIVED CLOB L2 CREDENTIALS ===");
  console.log("API_KEY=", derived.key);
  console.log("SECRET=", derived.secret);
  console.log("PASSPHRASE=", derived.passphrase);

  /**
   * Option B: create a new API key for the wallet (invalidates prior active key)
   * See createApiKey() in Polymarket L1 methods docs.
   *
   * Uncomment ONLY if you intentionally want to rotate keys:
   */
  // const created = await client.createApiKey();
  // console.log("=== CREATED (ROTATED) CLOB L2 CREDENTIALS ===");
  // console.log("API_KEY=", created.key);
  // console.log("SECRET=", created.secret);
  // console.log("PASSPHRASE=", created.passphrase);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
