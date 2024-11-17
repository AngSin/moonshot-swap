import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class PubkeyPipe implements PipeTransform {
  transform(value: string): PublicKey {
    try {
      return new PublicKey(value);
    } catch (_error) {
      throw new BadRequestException('Invalid address input!');
    }
  }
}
