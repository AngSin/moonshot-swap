import axios from 'axios';
import { readFileSync } from 'fs';
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

const secretKey = JSON.parse(
  readFileSync(`../.config/solana/id.json`).toString(),
);

const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

const connection = new Connection(process.env.RPC_ENDPOINT);

const randomTxMessage =
  'gAEABw4MyYzBggL7iJHTHVSkrNOviDOXqphG/pCt2yy+w4y2OAheuA41FDxnOfs3mlMsJADt03A2vmQ27LPRJH9ThjPGJcozYdUaZkESqFlGqpBIR0qfAuO6FjaFsr8A4cIx8pyuwcYjpNXWnqyr0GacOR4S4BsWeHJd6ZBZyEDej3URjyszU85Gfft6O5yXLB08rF+nD9pgzCPD6h53/Sk6ZV3JQBA101q7UxJdkemzADy4uL9GVmW/AUXrC5n4g9HQwBmIX+ty26zyhgqh+ScL7+EtXnc+eV1xipLI0cV7tmaqugMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAABVSKXnt4QJE7zId0cPx45LL7TRdCGNGuyuXrvOpLw9l9tCOZXirrHOpCbsbuLkp0BOxno8QkcdiggmCc8uVb4h8O8ybuNPbLOfUnun6rBZv/E10a0CUhDg0leZxkJLY8Bt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKmMlyWPTiSJ8bs9ECkUjg2DC1oTmdr/EIQEjnvY2+n4WQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAot7sNYvcSm0fJSZ+lYbQDXQeRppSg4c1cRxdumr5es8DBwAJA0ANAwAAAAAACAsAAQIDBAUJCgsMDSFmBj0SAdrr6gDh9QUAAAAAAwAAAAAAAAAB9AEAAAAAAAANAgAGDAIAAAAAAAAAAAAAAAA=';

describe('App', () => {
  it('should respond successfully to a "liveness" test', async () => {
    const res = await axios.get<string>('http://localhost:3000');
    expect(res.status).toBe(200);
    expect(res.data).toBe('Hello World!');
  });
  it('should let the user submit a valid tx once', async () => {
    const prepareResponse = await axios.post(
      'http://localhost:3000/orders/prepare',
      {
        trader: keypair.publicKey.toString(),
        direction: 'buy',
        token: '9ThH8ayxFCFZqssoZmodgvtbTiBmMoLWUqQhRAP89Y97',
        amount: 1_000,
      },
    );
    const { transactionMessage } = prepareResponse.data;
    const versionedMessage = VersionedMessage.deserialize(
      Buffer.from(transactionMessage, 'base64'),
    );

    const versionedTransaction = new VersionedTransaction(versionedMessage);

    versionedTransaction.sign([keypair]);

    const signedTx = Buffer.from(versionedTransaction.serialize()).toString(
      'base64',
    );

    const treasuryAccount = new PublicKey(process.env.TREASURY_ACCOUNT);
    const treasuryBalanceBeforeTx = await connection.getBalance(
      treasuryAccount,
      'confirmed',
    );

    const submitResponse = await axios.post(
      'http://localhost:3000/orders/submit',
      {
        signedTx,
      },
    );
    expect(submitResponse.status).toBe(201);

    const { txHash } = submitResponse.data;
    const confirmed = await connection.confirmTransaction(txHash, 'confirmed');
    expect(confirmed).toBeTruthy();
    expect(confirmed.value.err).toBeNull();

    const treasuryBalanceAfterTx = await connection.getBalance(
      treasuryAccount,
      'confirmed',
    );
    expect(treasuryBalanceAfterTx).toBeGreaterThan(treasuryBalanceBeforeTx);

    await expect(
      axios.post('http://localhost:3000/orders/submit', {
        signedTx,
      }),
    ).rejects.toThrow('Request failed with status code 400');
  });

  it('should fail with a BAD REQUEST if a random message is signed (order not found)', async () => {
    const versionedMessage = VersionedMessage.deserialize(
      Buffer.from(randomTxMessage, 'base64'),
    );

    const versionedTransaction = new VersionedTransaction(versionedMessage);

    versionedTransaction.sign([keypair]);

    const signedTx = Buffer.from(versionedTransaction.serialize()).toString(
      'base64',
    );

    await expect(
      axios.post('http://localhost:3000/orders/submit', {
        signedTx,
      }),
    ).rejects.toThrow('Request failed with status code 400');
  });
});
