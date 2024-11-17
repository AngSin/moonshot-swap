import axios from 'axios';
import { readFileSync } from 'fs';
import {
  Connection,
  Keypair,
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

const randomTx =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAHDgzJjMGCAvuIkdMdVKSs06+IM5eqmEb+kK3bLL7DjLY4CF64DjUUPGc5+zeaUywkAO3TcDa+ZDbss9Ekf1OGM8YlyjNh1RpmQRKoWUaqkEhHSp8C47oWNoWyvwDhwjHynK7BxiOk1daerKvQZpw5HhLgGxZ4cl3pkFnIQN6PdRGPKzNTzkZ9+3o7nJcsHTysX6cP2mDMI8PqHnf9KTplXclAEDXTWrtTEl2R6bMAPLi4v0ZWZb8BResLmfiD0dDAGYhf63LbrPKGCqH5Jwvv4S1edz55XXGKksjRxXu2Zqq6AwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAFVIpee3hAkTvMh3Rw/HjksvtNF0IY0a7K5eu86kvD2X20I5leKusc6kJuxu4uSnQE7GejxCRx2KCCYJzy5VviHw7zJu409ss59Se6fqsFm/8TXRrQJSEODSV5nGQktjwG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqYyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACJ4qXaW8Rz7dqWI5DkJge1aXqiSasbIgA0Qwm/gQNPwQMHAAkDQA0DAAAAAAAICwABAgMEBQkKCwwNIWYGPRIB2uvqAOH1BQAAAAACAAAAAAAAAAH0AQAAAAAAAA0CAAYMAgAAAAAAAAAAAAAAAA==';

describe('App', () => {
  it('should respond successfully to a "liveness" test', async () => {
    const res = await axios.get<string>('http://localhost:3000');
    expect(res.status).toBe(200);
    expect(res.data).toBe('Hello World!');
  });
  it('should submit a valid tx', async () => {
    const prepareResponse = await axios.post(
      'http://localhost:3000/orders/prepare',
      {
        trader: keypair.publicKey.toString(),
        direction: 'buy',
        token: '9ThH8ayxFCFZqssoZmodgvtbTiBmMoLWUqQhRAP89Y97',
        amount: 10,
      },
    );
    const { message } = prepareResponse.data;
    const versionedMessage = VersionedMessage.deserialize(
      Buffer.from(message, 'base64'),
    );

    const versionedTransaction = new VersionedTransaction(versionedMessage);

    versionedTransaction.sign([keypair]);

    const signedTx = Buffer.from(versionedTransaction.serialize()).toString(
      'base64',
    );
    console.log(signedTx);

    const submitResponse = await axios.post(
      'http://localhost:3000/orders/submit',
      {
        signedTx,
      },
    );

    console.log(submitResponse.data);

    const { txHash } = submitResponse.data;
    const confirmed = await connection.confirmTransaction(txHash, 'confirmed');
    console.log(confirmed);
  });
});
