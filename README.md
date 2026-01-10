# Polymarket-Copy-Trading-Bot
An open-source Polymarket copy-trading bot that automatically mirrors trades from selected wallets in real time.

PolyMirror
Open-Source Polymarket Copy Trading Bot

==================================================

OVERVIEW
--------

PolyMirror is a free and open-source copy trading bot for Polymarket that
automatically mirrors trades from selected wallets in real time.

The project is designed for transparency, safety, and developer control.
All logic is fully visible, runs locally, and never takes custody of user funds.

There are no hidden mechanics, no telemetry, and no centralized services.


FEATURES
--------

- Real-time Polymarket copy trading
- Copy trades from one or multiple wallets
- Configurable trade sizing and execution logic
- Written in TypeScript / Node.js
- Secure environment-based credential handling
- Local trade and position logging
- 100% free and open-source


SECURITY AND TRANSPARENCY
-------------------------

Security is a core principle of PolyMirror:

- No private keys are committed to the repository
- No remote servers or background services
- No custody of user funds
- All trading logic is fully visible in the source code
- Runs entirely on your local machine

You always remain in full control of your wallet.


PROJECT STRUCTURE
-----------------

polymirror/
│
├── copy-trades.ts
│   Core copy trading logic
│
├── run-forever.mjs
│   Continuous execution loop
│
├── check-allowance.ts
│   Token allowance verification
│
├── generate-polymarket-creds.ts
│   Polymarket API credential helper
│
├── positions.json
│   Current mirrored positions snapshot
│
├── orders.ndjson
│   Trade execution logs
│
├── package.json
├── tsconfig.json
└── .env
    Environment variables (ignored by git)


REQUIREMENTS
------------

- Node.js version 18 or higher
- npm or yarn
- A funded Polymarket-compatible wallet
- Polymarket API credentials


INSTALLATION
------------

Clone the repository and install dependencies:

git clone https://github.com/yourusername/polymirror.git
cd polymirror
npm install


ENVIRONMENT SETUP
-----------------

Create a .env file in the project root:

PRIVATE_KEY=your_wallet_private_key
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
RPC_URL=https://your_rpc_endpoint

IMPORTANT:
Never share your private key or .env file.


RUNNING THE BOT
---------------

Start the copy trading process:

node run-forever.mjs

The bot will:
1. Monitor selected Polymarket trader wallets
2. Detect new trades and positions
3. Mirror those trades in your wallet
4. Log all actions locally


DEVELOPMENT
-----------

Run in development mode:

npm run dev

Build the project:

npm run build


LOGS AND DATA
-------------

orders.ndjson
- Executed trades history

positions.json
- Current mirrored positions

These files can be used for auditing, debugging, and strategy analysis.


DISCLAIMER
----------

This software is provided for educational and research purposes only.

Trading involves financial risk.
Past performance of copied wallets does not guarantee future results.
You are solely responsible for any losses incurred.

Use this software at your own risk.


LICENSE
-------

MIT License

This project is licensed under the MIT License.

You are free to:
- Use
- Modify
- Distribute
- Use commercially

See the LICENSE file for full legal details.


CONTRIBUTING
------------

Contributions are welcome.

- Open issues for bugs or feature requests
- Submit pull requests for improvements
- Keep changes clean, readable, and secure


SUPPORT THE PROJECT
-------------------

If you find PolyMirror useful:
- Star the repository
- Share it with other developers
- Contribute improvements


AUTHOR
------

Created and maintained by Yousef
Open-source blockchain developer
