PRIVATE_KEY=0x72e635fdf1abdefa887a27eb8360192357aaf82d048fa67cb64db15ed352bbbf
FUNDER_ADDRESS=0x553c607a340c5c73aa5b3b78ed3a3c40dfc30bd3
SIGNATURE_TYPE=2             # depends on your login type (see Polymarket docs/examples)

API_KEY=828bf018-cd24-c76f-7222-f32a346ce3f4
SECRET=Gon00lpRfFS2jQ4b2rhDQx-bo92_QXf2RFpZBeJshsU=
PASSPHRASE=1dce70d9e42738adbf57f41531f32dd495080f8d415064a60b9ec7a94b9789b0

TARGET_WALLET=0x6031b6eed1c97e853c6e0f03ad3ce3529351f96d
POLL_MS=50                 # 2s polling
SIZE_MULTIPLIER=0.50      # copy size exactly = 1.0, half size = 0.5, etc.
MAX_ORDERS_PER_MIN=5000
POLYGON_RPC=https://polygon-bor-rpc.publicnode.com
DO_APPROVE=true
MIN_BUY_USDC_PER_ORDER=1
MIN_BUY_USDC_BUFFER=0.002
SUPPRESS_CLOB_CLIENT_ERRORS=1

usedTimes=

# NEW RULES:
MAX_USDC_PER_ORDER=5000        # cap BUY notional: size*price <= this
MIN_SHARES_PER_ORDER=1       # skip if size < this
POLYGON_WS=wss://polygon-bor-rpc.publicnode.com
BALANCE_REFRESH_MS=10000
MAX_INFLIGHT=8

ORDERS_LOG_PATH=./orders.ndjson
POSITIONS_SNAPSHOT_PATH=./positions.json
SNAPSHOT_EVERY_N=50
