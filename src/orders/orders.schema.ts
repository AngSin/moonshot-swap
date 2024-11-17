import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Direction } from './orders.types';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ collection: 'orders' })
export class Order {
  @Prop({ type: String, required: true, index: true, unique: true })
  transactionMessage: string;

  @Prop({ required: true })
  submitted: boolean;

  @Prop({ required: true })
  lastValidBlockHeight: number;

  @Prop({ required: true })
  trader: string;

  @Prop({ required: true })
  direction: Direction;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: false })
  signedTx?: string;

  @Prop({ required: false })
  txHash?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
