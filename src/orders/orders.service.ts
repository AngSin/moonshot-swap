import { Model } from 'mongoose';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './orders.schema';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Direction } from './orders.types';
import { SolanaService } from '../solana/solana.service';
import { sign } from 'tweetnacl';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly solanaService: SolanaService,
  ) {}

  async prepare(
    token: PublicKey,
    amount: number,
    direction: Direction,
    trader: PublicKey,
  ): Promise<Order> {
    const { transactionMessage, lastValidBlockHeight } =
      await this.solanaService.prepareTx(token, amount, trader, direction);
    const newOrder = new this.orderModel<Order>({
      transactionMessage: transactionMessage,
      lastValidBlockHeight,
      submitted: false,
      trader: trader.toBase58(),
      direction,
      token: token.toBase58(),
      amount,
    });
    console.log(`Inserting new order: ${JSON.stringify(newOrder, null, 2)}`);
    return await newOrder.save();
  }

  private verifyTransactionSignatures(signedTx: string, trader: string) {
    const signedTransaction = VersionedTransaction.deserialize(
      Buffer.from(signedTx, 'base64'),
    );

    const messageBytes = signedTransaction.message.serialize();

    const validSignature = signedTransaction.signatures.some(
      (signature, index) => {
        const traderPublicKey = new PublicKey(trader);
        const isSignedByTrader =
          signature.length > 32 &&
          sign.detached.verify(
            messageBytes,
            signature,
            traderPublicKey.toBytes(),
          );

        console.log(`Found valid signature at index ${index}`);

        return isSignedByTrader;
      },
    );

    if (!validSignature) {
      throw new BadRequestException(
        'Transaction signatures are invalid or not signed by the original trader',
      );
    }
  }

  private getMessage(signedTx: string): string {
    const signedTransaction = VersionedTransaction.deserialize(
      Buffer.from(signedTx, 'base64'),
    );
    return Buffer.from(signedTransaction.message.serialize()).toString(
      'base64',
    );
  }

  private async verifyTransactionExpiration(order: Order) {
    const blockHeight = await this.solanaService.getBlockHeight();

    if (blockHeight > order.lastValidBlockHeight) {
      throw new BadRequestException('Transaction expired!');
    }
  }

  async submit(signedTx: string): Promise<Order> {
    console.log(`Checking signed tx: ${signedTx}`);
    const message = this.getMessage(signedTx);
    console.log(`Found message: ${message}`);

    const existingOrder = await this.orderModel.findOne({
      transactionMessage: message,
    });

    if (!existingOrder) {
      throw new BadRequestException('Order not found');
    }

    console.log(`Found order: ${JSON.stringify(existingOrder, null, 2)}`);

    await this.verifyTransactionExpiration(existingOrder);

    this.verifyTransactionSignatures(signedTx, existingOrder.trader);

    console.log(`Passed all checks, sending signed tx: ${signedTx}`);

    const txHash = await this.solanaService.submitTx(signedTx);

    return this.orderModel.findOneAndUpdate(
      { transactionMessage: message },
      { $set: { submitted: true, signedTx, txHash } },
      { new: true },
    );
  }
}
