import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Direction } from './orders.types';

@Injectable()
export class DirectionPipe implements PipeTransform {
  transform(value?: string): Direction {
    if (!value) {
      throw new BadRequestException('Direction input is missing!');
    }
    const upperCaseVal = value.toUpperCase();
    if (Direction[upperCaseVal]) {
      return Direction[upperCaseVal];
    }
    throw new BadRequestException('Invalid direction input!');
  }
}
