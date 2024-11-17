### Running the project
After running `npm` dependencies and with `docker` running, run:
```bash
bash scripts/start.sh
```

### Integration Testing on Mac

1. If you don't have a local solana keypair, generate one: `solana-keygen new` and airdrop it with some SOL (`solana airdrop 1`)
2. Run the project
3. In a new terminal, run `npm run test:e2e`

### Development:

- `docker run --name some-mongo -d -p 27017:27017 -e MONGO_INITDB_DATABASE=orders mongo`
- `npm run start:dev`

### Improvements:

- add checks for SOL balance before buys & token balance before sells
- `confirmed` field in the db
- logging
- check for amount of trade against number of decimals is missing
- took the compute units calculation from the example
- handling error if token is not on moonshot bonding curve
