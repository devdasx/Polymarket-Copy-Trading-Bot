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
```

---

## ⚙️ Requirements

- Node.js **v18 or higher**
- npm or yarn
- A funded **Polymarket-compatible wallet**
- Polymarket API credentials

---

## 📦 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/polymirror.git
cd polymirror
npm install
```

---

## 🔐 Environment Setup

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_wallet_private_key
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
RPC_URL=https://your_rpc_endpoint
```

> ⚠️ **Never share your private key or `.env` file.**

---

## ▶️ Running the Bot

Start the copy trading process:

```bash
node run-forever.mjs
```

The bot will:

1. Monitor selected Polymarket trader wallets  
2. Detect new trades and positions  
3. Mirror those trades in your wallet  
4. Log all actions locally  

---

## 🧪 Development

Run the project in development mode:

```bash
npm run dev
```

Build the project for production:

```bash
npm run build
```

---

## 📊 Logs & Data

| File              | Description                          |
|-------------------|--------------------------------------|
| `orders.ndjson`   | Executed trade history               |
| `positions.json` | Current mirrored positions snapshot |

These files are useful for **auditing**, **debugging**, and **analysis**.

---

## ⚠️ Disclaimer

This software is provided **for educational and research purposes only**.

- Trading involves financial risk  
- Past performance does **not** guarantee future results  
- You are solely responsible for any losses incurred  

**Use this software at your own risk.**

---

## 📜 License

This project is licensed under the **MIT License**.

You are free to:
- Use
- Modify
- Distribute
- Use commercially  

See the `LICENSE` file for full legal details.

---

## 🤝 Contributing

Contributions are welcome and encouraged.

- Open issues for bugs or feature requests  
- Submit pull requests for improvements  
- Keep changes **clean**, **readable**, and **secure**

---

## ⭐ Support the Project

If you find PolyMirror useful:

- ⭐ Star the repository  
- 🧠 Share it with other developers  
- 🛠️ Contribute improvements  



## 👤 Author

Created and maintained by **DevDasX**  
Open-source blockchain developer
