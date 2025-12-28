import { Controller } from '@nestjs/common';
import { MoveOutService } from './move-out.service';

@Controller('move-out')
export class MoveOutController {
  constructor(private readonly moveOutService: MoveOutService) {}
}
