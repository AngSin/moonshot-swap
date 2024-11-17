import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './orders.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SolanaModule } from '../solana/solanaModule';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    SolanaModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
