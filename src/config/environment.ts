export default () => ({
  solana: {
    rpcEndpoint: process.env.RPC_ENDPOINT,
    network: process.env.NETWORK,
  },
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
  treasuryAccount: process.env.TREASURY_ACCOUNT,
});
