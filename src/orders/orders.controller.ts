import {
  Body,
  Controller,
  InternalServerErrorException,
  ParseFloatPipe,
  Post,
} from '@nestjs/common';
import { PubkeyPipe } from '../validation/pubkey.pipe';
import { PublicKey } from '@solana/web3.js';
import { DirectionPipe } from './direction.pipe';
import { Direction } from './orders.types';
import { Order } from './orders.schema';
import { OrdersService } from './orders.service';

@Controller('/orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('/prepare')
  async prepare(
    @Body('token', PubkeyPipe) token: PublicKey,
    @Body('amount', ParseFloatPipe) amount: number,
    @Body('direction', DirectionPipe) direction: Direction,
    @Body('trader', PubkeyPipe) trader: PublicKey,
  ): Promise<Order> {
    try {
      return this.ordersService.prepare(token, amount, direction, trader);
    } catch (error) {
      const message = (error as Error).message;
      console.error(message, error);
      throw new InternalServerErrorException(message);
    }
  }

  @Post('/submit')
  async submit(@Body('signedTx') signedTx: string): Promise<Order> {
    return this.ordersService.submit(signedTx);
  }
}
