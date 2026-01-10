# PolyMirror 🪞
### Open-Source Polymarket Copy Trading Bot

PolyMirror is a **free and open-source copy trading bot for Polymarket** that automatically mirrors trades from selected wallets in real time.

Built with a strong focus on **transparency, safety, and developer control**.  
No custody. No hidden logic. Fully auditable.

---

## 🚀 Overview

PolyMirror monitors one or more Polymarket trader wallets and replicates their trades using your own wallet.

The project is designed to be:
- **Open source and auditable**
- **Non-custodial** (you control your funds)
- **Local-only execution**
- **Simple and predictable**

There are no centralized services, no telemetry, and no closed components.

---

## ✨ Features

- 🔁 Real-time Polymarket copy trading  
- 👛 Copy trades from one or multiple wallets  
- ⚙️ Configurable trade sizing and execution logic  
- 🧠 Written in **TypeScript / Node.js**  
- 🔐 Secure credential handling via environment variables  
- 🧾 Local trade and position logging  
- 🆓 **100% free and open-source**

---

## 🛡️ Security & Transparency

Security is a core principle of PolyMirror.

- No private keys committed to the repository  
- No remote servers or background services  
- No custody of user funds  
- All trading logic is fully visible in the source code  
- Runs entirely on your local machine  

> You always remain in **full control of your wallet and assets**.

---

## 📁 Project Structure

```text
polymirror/
├── copy-trades.ts               # Core copy trading logic
├── run-forever.mjs              # Continuous execution loop
├── check-allowance.ts           # Token allowance verification
├── generate-polymarket-creds.ts # API credential helper
├── positions.json               # Current mirrored positions
├── orders.ndjson                # Trade execution logs
├── package.json
├── tsconfig.json
└── .env                         # Environment variables (ignored)
