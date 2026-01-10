import "dotenv/config";
import { ethers } from "ethers";

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const ADDRESSES = {
  // Polygon mainnet addresses (Polymarket docs)
  USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  CTF: "0x4d97dcd97ec945f40cf65f87097ace5ea0476045",
  CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
} as const;

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
] as const;

const ERC1155_APPROVAL_ABI = [
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
] as const;

async function main() {
  const rpc = env("POLYGON_RPC", "https://polygon-bor-rpc.publicnode.com");
  const provider = new ethers.providers.JsonRpcProvider(rpc);

  const privateKey = env("PRIVATE_KEY");
  const signer = new ethers.Wallet(privateKey, provider);

  const funder = (process.env.FUNDER_ADDRESS?.trim() || signer.address).toLowerCase();
  const doApprove = (process.env.DO_APPROVE ?? "false").toLowerCase() === "true";

  console.log("RPC:", rpc);
  console.log("Signer:", signer.address);
  console.log("Funder (maker to check):", funder);
  console.log("doApprove:", doApprove);

  const usdc = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, signer);
  const ctf = new ethers.Contract(ADDRESSES.CTF, ERC1155_APPROVAL_ABI, signer);

  const symbol: string = await usdc.symbol();
  const decimals: number = await usdc.decimals();

  const bal = await usdc.balanceOf(funder);
  console.log(`\nUSDC token: ${symbol} decimals=${decimals}`);
  console.log(`USDC balance of funder: ${ethers.utils.formatUnits(bal, decimals)}`);

  // USDC allowance funder -> CTF
  const allowance = await usdc.allowance(funder, ADDRESSES.CTF);
  console.log(`USDC allowance funder -> CTF: ${ethers.utils.formatUnits(allowance, decimals)}`);

  const operators = [
    { name: "CTF_EXCHANGE", addr: ADDRESSES.CTF_EXCHANGE },
    { name: "NEG_RISK_CTF_EXCHANGE", addr: ADDRESSES.NEG_RISK_CTF_EXCHANGE },
    { name: "NEG_RISK_ADAPTER", addr: ADDRESSES.NEG_RISK_ADAPTER },
  ];

  console.log("\nCTF approvals (isApprovedForAll):");
  for (const op of operators) {
    const ok: boolean = await ctf.isApprovedForAll(funder, op.addr);
    console.log(`  ${op.name} (${op.addr}): ${ok}`);
  }

  if (!doApprove) {
    console.log("\nDO_APPROVE=false, not sending transactions.");
    console.log("If allowance/approvals are missing, run with DO_APPROVE=true.");
    return;
  }

  // Critical: You can only approve from the address you control with PRIVATE_KEY.
  if (funder !== signer.address.toLowerCase()) {
    throw new Error(
      `Funder (${funder}) != signer (${signer.address.toLowerCase()}). ` +
        `You must approve using the private key that controls the funder/proxy (maker) address.`
    );
  }

  // Approve USDC -> CTF if allowance is zero
  if (allowance.eq(0)) {
    console.log("\nApproving USDC -> CTF (MaxUint256)...");
    const tx = await usdc.approve(ADDRESSES.CTF, ethers.constants.MaxUint256);
    console.log("Sent:", tx.hash);
    await tx.wait();
    console.log("Confirmed.");
  } else {
    console.log("\nUSDC -> CTF allowance already non-zero; skipping approve.");
  }

  // SetApprovalForAll for operators if missing
  for (const op of operators) {
    const ok: boolean = await ctf.isApprovedForAll(signer.address, op.addr);
    if (!ok) {
      console.log(`\nSetting CTF setApprovalForAll(true) for ${op.name}...`);
      const tx = await ctf.setApprovalForAll(op.addr, true);
      console.log("Sent:", tx.hash);
      await tx.wait();
      console.log("Confirmed.");
    } else {
      console.log(`\nCTF approval already true for ${op.name}; skipping.`);
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nERROR:", e);
  process.exit(1);
});
