import { Injectable } from '@nestjs/common';
import { Environment, FixedSide, Moonshot } from '@wen-moon-ser/moonshot-sdk';
import { ConfigService } from '@nestjs/config';
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { Direction } from '../orders/orders.types';

@Injectable()
export class SolanaService {
  private readonly connection: Connection;
  private readonly moonshot: Moonshot;
  private readonly feeBasisPoints = 100n;
  private readonly treasuryAccount: PublicKey;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('solana.rpcEndpoint');
    this.connection = new Connection(rpcUrl);
    this.moonshot = new Moonshot({
      rpcUrl,
      environment: this.configService.get<Environment>('solana.network'),
      chainOptions: {
        solana: { confirmOptions: { commitment: 'confirmed' } },
      },
    });
    this.treasuryAccount = new PublicKey(
      this.configService.get<string>('treasuryAccount'),
    );
  }

  private calculateFees(orderAmountInLamports: bigint): bigint {
    return orderAmountInLamports / this.feeBasisPoints;
  }

  async getBlockHeight(): Promise<number> {
    return this.connection.getBlockHeight('confirmed');
  }

  async prepareTx(
    mintAccount: PublicKey,
    roughAmount: number,
    trader: PublicKey,
    direction: Direction,
  ): Promise<{
    transactionMessage: string;
    lastValidBlockHeight: number;
  }> {
    const token = this.moonshot.Token({
      mintAddress: mintAccount.toString(),
    });
    const { decimals } = await getMint(this.connection, mintAccount);
    console.log(
      `Found: ${decimals} decimals for token mint account ${mintAccount.toString()}`,
    );
    const tokenAmount: bigint = BigInt(roughAmount * 10 ** decimals);
    const orderAmountInLamports = await token.getCollateralAmountByTokens({
      tokenAmount,
      tradeDirection: direction,
    });
    const fees = this.calculateFees(orderAmountInLamports);
    console.log(
      `Will transfer ${fees} lamports in fees to the treasury wallet ${this.treasuryAccount.toString()}`,
    );
    const transferFeesInstruction = SystemProgram.transfer({
      fromPubkey: trader,
      toPubkey: this.treasuryAccount,
      lamports: fees,
    });

    const collateralAmount = orderAmountInLamports - fees;
    console.log(
      `preparing instructions to ${direction} ${collateralAmount} lamports of token ${mintAccount.toString()}`,
    );
    const { ixs: moonshotInstructions } = await token.prepareIxs({
      slippageBps: 500,
      creatorPK: trader.toBase58(),
      tokenAmount,
      collateralAmount,
      tradeDirection: direction,
      fixedSide: FixedSide.OUT, // This means you will get exactly the token amount and slippage is applied to collateral amount
    });

    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 200_000,
    });

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed');

    const messageV0 = new TransactionMessage({
      payerKey: trader,
      recentBlockhash: blockhash,
      instructions: [
        priorityIx,
        ...moonshotInstructions,
        transferFeesInstruction,
      ],
    }).compileToV0Message();

    const message = Buffer.from(messageV0.serialize()).toString('base64');

    console.log(`Serialized message: ${message}`);
    return {
      transactionMessage: message,
      lastValidBlockHeight,
    };
  }

  async submitTx(signedTx: string): Promise<string> {
    const versionedTransaction = VersionedTransaction.deserialize(
      Buffer.from(signedTx, 'base64'),
    );

    const txHash = await this.connection.sendTransaction(versionedTransaction, {
      skipPreflight: false,
      maxRetries: 0,
      preflightCommitment: 'confirmed',
    });

    console.log(`Order Transaction Hash: ${txHash}`);

    return txHash;
  }
}
