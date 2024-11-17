import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Direction } from './orders.types';
import { PublicKey } from '@solana/web3.js';
import { SolanaService } from '../solana/solana.service';
import { ConfigService } from '@nestjs/config';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      return `https://${key}`;
    }),
  };

  const mockOrderModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        SolanaService,
        {
          provide: ConfigService, // Mock ConfigService
          useValue: mockConfigService,
        },
        {
          provide: 'OrderModel', // Mock OrderModel
          useValue: mockOrderModel,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('prepare', () => {
    it('should return the order saved by the service layer', async () => {
      const expectedResult = {
        message:
          'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAHDgzJjMGCAvuIkdMdVKSs06+IM5eqmEb+kK3bLL7DjLY4CF64DjUUPGc5+zeaUywkAO3TcDa+ZDbss9Ekf1OGM8YlyjNh1RpmQRKoWUaqkEhHSp8C47oWNoWyvwDhwjHynK7BxiOk1daerKvQZpw5HhLgGxZ4cl3pkFnIQN6PdRGPKzNTzkZ9+3o7nJcsHTysX6cP2mDMI8PqHnf9KTplXclAEDXTWrtTEl2R6bMAPLi4v0ZWZb8BResLmfiD0dDAGYhf63LbrPKGCqH5Jwvv4S1edz55XXGKksjRxXu2Zqq6AwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAFVIpee3hAkTvMh3Rw/HjksvtNF0IY0a7K5eu86kvD2X20I5leKusc6kJuxu4uSnQE7GejxCRx2KCCYJzy5VviHw7zJu409ss59Se6fqsFm/8TXRrQJSEODSV5nGQktjwG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqYyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACdvHCTi188dUE/zRoR0rWdQgEi3J84FTmjFWsQ0fSGTQMHAAkDQA0DAAAAAAAICwABAgMEBQkKCwwNIWYGPRIB2uvqAOH1BQAAAAACAAAAAAAAAAH0AQAAAAAAAA0CAAYMAgAAAAAAAAAAAAAAAA==',
        submitted: false,
        lastValidBlockHeight: 328730670,
        trader: 'rv9MdKVp2r13ZrFAwaES1WAQELtsSG4KEMdxur8ghXd',
        direction: Direction.BUY,
        token: '9ThH8ayxFCFZqssoZmodgvtbTiBmMoLWUqQhRAP89Y97',
        amount: 0.1,
      };

      jest
        .spyOn(ordersService, 'prepare')
        .mockImplementation(() => Promise.resolve(expectedResult));

      const token = new PublicKey(
        '9ThH8ayxFCFZqssoZmodgvtbTiBmMoLWUqQhRAP89Y97',
      );
      const trader = new PublicKey(
        'rv9MdKVp2r13ZrFAwaES1WAQELtsSG4KEMdxur8ghXd',
      );
      const amount = 1000;
      const direction = Direction.BUY;
      const res = await controller.prepare(token, amount, direction, trader);

      expect(ordersService.prepare).toHaveBeenCalledWith(
        token,
        amount,
        direction,
        trader,
      );
      expect(res).toEqual(expectedResult);
    });

    it('should return a 500 if service layer fails', async () => {
      const dummyAccount = new PublicKey(
        'rv9MdKVp2r13ZrFAwaES1WAQELtsSG4KEMdxur8ghXd',
      );
      jest.spyOn(ordersService, 'prepare').mockImplementation(() => {
        throw new Error();
      });
      jest.spyOn(console, 'error').mockImplementation(() => {}); // avoiding console spam in test

      await expect(async () => {
        await controller.prepare(dummyAccount, 1, Direction.SELL, dummyAccount);
      }).rejects.toThrow(InternalServerErrorException);

      expect(ordersService.prepare).toHaveBeenCalledWith(
        dummyAccount,
        1,
        Direction.SELL,
        dummyAccount,
      );
    });
  });
});
