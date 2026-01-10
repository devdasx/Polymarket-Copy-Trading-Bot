import "dotenv/config";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { ClobClient, Side } from "@polymarket/clob-client";
import { ethers } from "ethers";

// Polymarket exchange contracts (Polygon)
const CTF_EXCHANGE = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
const NEG_RISK_CTF_EXCHANGE = "0xC5d563A36AE78145C45a50134d48A1215220f80a";

// USDC (Polygon)
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_DECIMALS = 6;

// OrderFilled event ABI
const ORDERFILLED_ABI = [
  "event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled, uint256 fee)",
] as const;

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"] as const;

/* ------------------------- helpers ------------------------- */

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env ${name}=${raw}`);
  return n;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function fmt(n: number, digits = 6): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function usd(n: number, digits = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function shortToken(s: string) {
  return s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendNdjson(filePath: string, obj: unknown) {
  const line = JSON.stringify(obj) + "\n";
  fs.promises.appendFile(filePath, line).catch(() => {});
}

async function loadSnapshot(snapshotPath: string): Promise<any | null> {
  try {
    const raw = await fs.promises.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveSnapshot(snapshotPath: string, data: unknown) {
  fs.promises.writeFile(snapshotPath, JSON.stringify(data)).catch(() => {});
}

function pnlColor(v: number) {
  if (v > 0) return chalk.green;
  if (v < 0) return chalk.red;
  return chalk.gray;
}

/* ------------------------- rate limiting ------------------------- */

class MinuteLimiter {
  private timestamps: number[] = [];
  private maxPerMinute: number;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
  }

  allow(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t >= oneMinuteAgo);
    if (this.timestamps.length >= this.maxPerMinute) return false;
    this.timestamps.push(now);
    return true;
  }
}

class InflightGate {
  private inflight = 0;
  private maxInflight: number;

  constructor(maxInflight: number) {
    this.maxInflight = maxInflight;
  }

  tryEnter(): boolean {
    if (this.inflight >= this.maxInflight) return false;
    this.inflight++;
    return true;
  }

  exit() {
    this.inflight = Math.max(0, this.inflight - 1);
  }
}

/* ----------------------- positions + PnL (AVG COST) ----------------------- */

type TokenState = {
  shares: number;        // open shares
  costUSDC: number;      // cost basis for open shares
  realizedUSDC: number;  // realized pnl from sells
  lastPrice: number;     // last seen price
};

type PositionsSnapshot = Record<string, TokenState>;

class PositionTrackerAvgPnL {
  private m = new Map<string, TokenState>();

  private getOrInit(tokenID: string): TokenState {
    const cur = this.m.get(tokenID);
    if (cur) return cur;
    const init: TokenState = { shares: 0, costUSDC: 0, realizedUSDC: 0, lastPrice: 0 };
    this.m.set(tokenID, init);
    return init;
  }

  markPrice(tokenID: string, price: number) {
    const st = this.getOrInit(tokenID);
    st.lastPrice = price;
  }

  onBuy(tokenID: string, shares: number, price: number) {
    const st = this.getOrInit(tokenID);
    st.lastPrice = price;
    st.shares += shares;
    st.costUSDC += shares * price;
  }

  onSell(tokenID: string, shares: number, price: number) {
    const st = this.getOrInit(tokenID);
    st.lastPrice = price;

    const sellShares = Math.min(shares, st.shares);
    if (sellShares <= 0) return;

    const avgPrice = st.shares > 0 ? st.costUSDC / st.shares : 0;

    const proceeds = price * sellShares;
    const costRemoved = avgPrice * sellShares;

    st.realizedUSDC += (proceeds - costRemoved);

    st.shares -= sellShares;
    st.costUSDC -= costRemoved;

    // Safety clamps
    if (st.shares < 0) st.shares = 0;
    if (st.costUSDC < 0) st.costUSDC = 0;
  }

  metrics(tokenID: string) {
    const st = this.getOrInit(tokenID);
    const avgPrice = st.shares > 0 ? st.costUSDC / st.shares : 0;
    const mtmValue = st.shares * st.lastPrice;
    const unrealized = mtmValue - st.costUSDC;

    return {
      shares: st.shares,
      lastPrice: st.lastPrice,
      avgPrice,
      costUSDC: st.costUSDC,
      mtmValue,
      unrealized,
      realized: st.realizedUSDC,
    };
  }

  toJSON(): PositionsSnapshot {
    const obj: PositionsSnapshot = {};
    for (const [k, v] of this.m.entries()) obj[k] = v;
    return obj;
  }

  loadFromJSON(obj: PositionsSnapshot) {
    this.m.clear();
    for (const [k, v] of Object.entries(obj)) {
      if (!v || typeof v !== "object") continue;

      const shares = Number((v as any).shares);
      const costUSDC = Number((v as any).costUSDC);
      const realizedUSDC = Number((v as any).realizedUSDC);
      const lastPrice = Number((v as any).lastPrice);

      this.m.set(k, {
        shares: Number.isFinite(shares) && shares >= 0 ? shares : 0,
        costUSDC: Number.isFinite(costUSDC) && costUSDC >= 0 ? costUSDC : 0,
        realizedUSDC: Number.isFinite(realizedUSDC) ? realizedUSDC : 0,
        lastPrice: Number.isFinite(lastPrice) && lastPrice >= 0 ? lastPrice : 0,
      });
    }
  }
}

/* ------------------------ balances / decode ---------------------- */

async function getUsdcBalance(provider: ethers.providers.Provider, addr: string): Promise<number> {
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const bal = await usdc.balanceOf(addr);
  return Number(ethers.utils.formatUnits(bal, USDC_DECIMALS));
}

/**
 * Decode fill into:
 * - BUY: makerAssetId == 0
 * - SELL: takerAssetId == 0
 */
function decodeFill(args: any) {
  const makerAssetId = ethers.BigNumber.from(args.makerAssetId);
  const takerAssetId = ethers.BigNumber.from(args.takerAssetId);
  const makerAmt = ethers.BigNumber.from(args.makerAmountFilled);
  const takerAmt = ethers.BigNumber.from(args.takerAmountFilled);

  const SCALE = ethers.BigNumber.from(1_000_000);

  if (makerAssetId.eq(0)) {
    const tokenID = takerAssetId.toString();
    const usdc = makerAmt;
    const shares = takerAmt;
    if (shares.isZero()) return null;
    const priceScaled = usdc.mul(SCALE).div(shares);
    return {
      side: "BUY" as const,
      tokenID,
      shares: Number(ethers.utils.formatUnits(shares, 6)),
      price: Number(ethers.utils.formatUnits(priceScaled, 6)),
    };
  }

  if (takerAssetId.eq(0)) {
    const tokenID = makerAssetId.toString();
    const shares = makerAmt;
    const usdc = takerAmt;
    if (shares.isZero()) return null;
    const priceScaled = usdc.mul(SCALE).div(shares);
    return {
      side: "SELL" as const,
      tokenID,
      shares: Number(ethers.utils.formatUnits(shares, 6)),
      price: Number(ethers.utils.formatUnits(priceScaled, 6)),
    };
  }

  return null;
}

function applyRules(params: {
  side: "BUY" | "SELL";
  price: number;
  shares: number;
  sizeMultiplier: number;
  minShares: number;
  maxUsdc: number;
}) {
  const price = clamp(params.price, 0, 1);
  let shares = params.shares * params.sizeMultiplier;

  if (!Number.isFinite(price) || !Number.isFinite(shares)) return null;
  if (price <= 0 || shares <= 0) return null;
  if (shares < params.minShares) return null;

  if (params.side === "BUY") {
    const notional = price * shares;
    if (notional > params.maxUsdc) {
      shares = params.maxUsdc / price;
      if (shares < params.minShares) return null;
    }
  }

  return { price, shares, notional: price * shares };
}

/**
 * Strict success detection:
 * We treat responses without an order id as failure.
 */
function isOrderSuccess(resp: any): { ok: boolean; reason?: string } {
  if (!resp) return { ok: false, reason: "empty response" };
  if (resp instanceof Error) return { ok: false, reason: resp.message };

  const text = JSON.stringify(resp).toLowerCase();

  if (text.includes("not enough balance") || text.includes("allowance")) return { ok: false, reason: "not enough balance / allowance" };
  if (text.includes("\"status\":400") || text.includes("bad request")) return { ok: false, reason: "http 400 bad request" };

  const err = resp.error ?? resp?.data?.error ?? resp?.response?.data?.error;
  if (err) return { ok: false, reason: String(err) };

  const orderId = resp.orderID || resp.orderId || resp.id || resp?.data?.orderID || resp?.data?.orderId;
  if (orderId) return { ok: true };

  return { ok: false, reason: "no order id returned" };
}

/* ------------------------------- main ---------------------------- */

async function main() {
  const TARGET = env("TARGET_WALLET").toLowerCase();
  const POLYGON_WS = env("POLYGON_WS");

  const sizeMultiplier = numEnv("SIZE_MULTIPLIER", 1.0);
  const maxUsdcPerOrder = numEnv("MAX_USDC_PER_ORDER", 50);
  const minSharesPerOrder = numEnv("MIN_SHARES_PER_ORDER", 1);
  const maxPerMin = numEnv("MAX_ORDERS_PER_MIN", 90);

  const balanceRefreshMs = numEnv("BALANCE_REFRESH_MS", 1500);
  const maxInflight = numEnv("MAX_INFLIGHT", 8);

  const ordersLogPath = process.env.ORDERS_LOG_PATH ?? "./logs/orders.ndjson";
  const snapshotPath = process.env.POSITIONS_SNAPSHOT_PATH ?? "./logs/positions.json";
  const snapshotEveryN = numEnv("SNAPSHOT_EVERY_N", 50);

  ensureDir(ordersLogPath);
  ensureDir(snapshotPath);

  const wsProvider = new ethers.providers.WebSocketProvider(POLYGON_WS);

  const signer = new ethers.Wallet(env("PRIVATE_KEY"));
  const apiCreds = { key: env("API_KEY"), secret: env("SECRET"), passphrase: env("PASSPHRASE") };
  const signatureType = Number(process.env.SIGNATURE_TYPE ?? "2");
  const funder = process.env.FUNDER_ADDRESS;
  const myFundsAddress = (funder || signer.address).toLowerCase();

  const clob = new ClobClient("https://clob.polymarket.com", 137, signer, apiCreds, signatureType, funder);

  const limiter = new MinuteLimiter(maxPerMin);
  const gate = new InflightGate(maxInflight);

  const positions = new PositionTrackerAvgPnL();
  const snap = await loadSnapshot(snapshotPath);
  if (snap) positions.loadFromJSON(snap as PositionsSnapshot);

  let totalBuyUSDC = 0;
  let totalSellUSDC = 0;
  let copiedCount = 0;

  // Cached USDC balance
  let cachedUsdcBalance: number | null = null;
  let balanceBusy = false;

  const refreshBalance = async () => {
    if (balanceBusy) return;
    balanceBusy = true;
    try {
      cachedUsdcBalance = await getUsdcBalance(wsProvider, myFundsAddress);
    } catch {
      // keep last value
    } finally {
      balanceBusy = false;
    }
  };

  await refreshBalance();
  setInterval(() => void refreshBalance(), balanceRefreshMs);

  const iface = new ethers.utils.Interface(ORDERFILLED_ABI);
  const topic0 = iface.getEventTopic("OrderFilled");

  const seen = new Set<string>();

  console.log(chalk.gray("─".repeat(120)));
  console.log(chalk.bold.white(" Polymarket Copy Trader — AVG PRICE + Correct PnL (MAX SPEED, submit-only)"));
  console.log(chalk.gray("─".repeat(120)));
  console.log(chalk.gray("Target:     "), chalk.cyan(TARGET));
  console.log(chalk.gray("Funds addr: "), chalk.yellow(myFundsAddress));
  console.log(chalk.gray("Polygon WS: "), chalk.white(POLYGON_WS));
  console.log(chalk.gray("Rules:      "), chalk.white(`MAX_BUY=${maxUsdcPerOrder} USDC | MIN_SHARES=${minSharesPerOrder} | x${sizeMultiplier}`));
  console.log(chalk.gray("Logs:       "), chalk.white(ordersLogPath));
  console.log(chalk.gray("Snapshot:   "), chalk.white(snapshotPath), chalk.gray(`(every ${snapshotEveryN} orders)`));
  console.log(chalk.gray("─".repeat(120)));

  const handleLog = async (log: ethers.providers.Log) => {
    const dedupKey = `${log.transactionHash}:${log.logIndex}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);

    if (!gate.tryEnter()) return;

    try {
      let parsed: ethers.utils.LogDescription;
      try {
        parsed = iface.parseLog(log);
      } catch {
        return;
      }

      const maker = String(parsed.args.maker).toLowerCase();
      if (maker !== TARGET) return;

      const fill = decodeFill(parsed.args);
      if (!fill) return;

      const sizing = applyRules({
        side: fill.side,
        price: fill.price,
        shares: fill.shares,
        sizeMultiplier,
        minShares: minSharesPerOrder,
        maxUsdc: maxUsdcPerOrder,
      });
      if (!sizing) return;

      if (!limiter.allow()) return;

      const submitStart = Date.now();
      let resp: any = null;
      try {
        resp = await clob.createAndPostOrder({
          tokenID: fill.tokenID,
          side: fill.side === "BUY" ? Side.BUY : Side.SELL,
          price: sizing.price,
          size: sizing.shares,
        });
      } catch (e: any) {
        resp = e;
      }
      const submitMs = Date.now() - submitStart;

      const verdict = isOrderSuccess(resp);
      const ok = verdict.ok;

      // Mark latest price (does not change avg, only affects MTM/unrealized)
      positions.markPrice(fill.tokenID, sizing.price);

      const sideColor = fill.side === "BUY" ? chalk.green : chalk.red;
      const balanceStr = cachedUsdcBalance === null ? chalk.gray("n/a") : chalk.white(usd(cachedUsdcBalance, 2));
      const status = ok ? chalk.bold.green("SUCCEED") : chalk.bold.red("FAILED");

      if (!ok) {
        console.log(chalk.gray("─".repeat(120)));
        console.log(
          `${status} ${chalk.gray("•")} ${sideColor(fill.side)} ` +
            `${chalk.gray("•")} ${chalk.gray("Shares:")} ${chalk.white(fmt(sizing.shares, 6))} ` +
            `${chalk.gray("Price:")} ${chalk.white(fmt(sizing.price, 6))} ${chalk.gray("USDC")} ` +
            `${chalk.gray("•")} ${chalk.gray("submit")} ${chalk.white(`${submitMs}ms`)} ` +
            `${chalk.gray("•")} ${chalk.gray("token")} ${chalk.cyan(shortToken(fill.tokenID))}`
        );
        console.log(`${chalk.gray("Notional:")} ${chalk.white(usd(sizing.notional, 4))} ${chalk.gray("|")} ${chalk.gray("USDC Balance:")} ${balanceStr}`);
        console.log(chalk.gray("Reason:"), chalk.red(verdict.reason ?? "unknown"));

        // Optional: log failed attempt (does NOT affect totals/positions)
        appendNdjson(ordersLogPath, {
          t: Date.now(),
          status: "FAILED",
          side: fill.side,
          tokenID: fill.tokenID,
          shares: sizing.shares,
          price: sizing.price,
          notionalUSDC: sizing.notional,
          submitMs,
          reason: verdict.reason ?? "unknown",
          tx: log.transactionHash,
          logIndex: log.logIndex,
        });
        return;
      }

      // SUCCESS: update totals + positions + PnL
      if (fill.side === "BUY") {
        totalBuyUSDC += sizing.notional;
        positions.onBuy(fill.tokenID, sizing.shares, sizing.price);
      } else {
        totalSellUSDC += sizing.notional;
        positions.onSell(fill.tokenID, sizing.shares, sizing.price);
      }

      const m = positions.metrics(fill.tokenID);
      copiedCount++;

      // Persist
      appendNdjson(ordersLogPath, {
        t: Date.now(),
        status: "SUCCEED",
        side: fill.side,
        tokenID: fill.tokenID,
        shares: sizing.shares,
        price: sizing.price,
        notionalUSDC: sizing.notional,
        submitMs,
        usdcBalanceCached: cachedUsdcBalance,
        tokenSharesNow: m.shares,
        tokenAvgPrice: m.avgPrice,
        tokenCostUSDC: m.costUSDC,
        tokenLastPrice: m.lastPrice,
        tokenMTMValueUSDC: m.mtmValue,
        tokenUnrealizedUSDC: m.unrealized,
        tokenRealizedUSDC: m.realized,
        tx: log.transactionHash,
        logIndex: log.logIndex,
      });

      if (copiedCount % snapshotEveryN === 0) {
        saveSnapshot(snapshotPath, positions.toJSON());
      }

      // Console log (still compact, but now with avg + PnL)
      console.log(chalk.gray("─".repeat(120)));
      console.log(
        `${status} ${chalk.gray("•")} ${sideColor(fill.side)} ` +
          `${chalk.gray("•")} ${chalk.gray("Shares:")} ${chalk.white(fmt(sizing.shares, 6))} ` +
          `${chalk.gray("Price:")} ${chalk.white(fmt(sizing.price, 6))} ${chalk.gray("USDC")} ` +
          `${chalk.gray("•")} ${chalk.gray("submit")} ${chalk.white(`${submitMs}ms`)} ` +
          `${chalk.gray("•")} ${chalk.gray("token")} ${chalk.cyan(shortToken(fill.tokenID))}`
      );

      console.log(`${chalk.gray("Notional:")} ${chalk.white(usd(sizing.notional, 4))} ${chalk.gray("|")} ${chalk.gray("USDC Balance:")} ${balanceStr}`);

      console.log(
        `${chalk.gray("Token shares:")} ${chalk.white(fmt(m.shares, 6))} ` +
          `${chalk.gray("|")} ${chalk.gray("Avg:")} ${chalk.white(fmt(m.avgPrice, 6))} ` +
          `${chalk.gray("|")} ${chalk.gray("Last:")} ${chalk.white(fmt(m.lastPrice, 6))}`
      );

      console.log(
        `${chalk.gray("Unrealized:")} ${pnlColor(m.unrealized)(usd(m.unrealized, 4))} ` +
          `${chalk.gray("|")} ${chalk.gray("Realized:")} ${pnlColor(m.realized)(usd(m.realized, 4))}`
      );

      console.log(
        `${chalk.gray("CUM BUY USDC:")} ${chalk.white(usd(totalBuyUSDC, 2))}  ` +
          `${chalk.gray("|")}  ${chalk.gray("CUM SELL USDC:")} ${chalk.white(usd(totalSellUSDC, 2))}`
      );
    } finally {
      gate.exit();
    }
  };

  // Subscribe to fills on both exchanges
  const filters: ethers.providers.Filter[] = [
    { address: CTF_EXCHANGE, topics: [topic0] },
    { address: NEG_RISK_CTF_EXCHANGE, topics: [topic0] },
  ];

  for (const f of filters) {
    wsProvider.on(f, (log) => void handleLog(log));
  }

  // If WS drops, exit so your supervisor/watchdog restarts it
  const ws: any = (wsProvider as any)._websocket;
  if (ws) {
    ws.on("close", () => {
      console.log(chalk.yellow("⚠ Polygon WS closed. Exiting so supervisor restarts..."));
      process.exit(1);
    });
    ws.on("error", (e: any) => {
      console.log(chalk.red("Polygon WS error:"), String(e));
      process.exit(1);
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
