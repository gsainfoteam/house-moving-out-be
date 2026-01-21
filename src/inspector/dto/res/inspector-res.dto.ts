import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InspectionSlot } from 'generated/prisma/client';
import { InspectorWithSlots } from 'src/inspector/types/inspector-with-slots.type';
import { InspectionSlotResDto } from 'src/move-out/dto/res/move-out-schedule-with-slots-res.dto';

export class InspectorResDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inspector UUID',
  })
  uuid: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Inspector name',
  })
  name: string;

  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Inspector email',
  })
  email: string;

  @ApiProperty({
    example: '20250000',
    description: 'Inspector student number',
  })
  studentNumber: string;

  @ApiProperty({
    description: 'Available inspection times',
    type: [InspectionSlotResDto],
  })
  @Transform(({ value }: { value: { inspectionSlot: InspectionSlot }[] }) =>
    value.map((slot) => slot.inspectionSlot),
  )
  availableSlots: InspectionSlotResDto[];

  constructor(partial: InspectorWithSlots) {
    Object.assign(this, partial);
  }
}
