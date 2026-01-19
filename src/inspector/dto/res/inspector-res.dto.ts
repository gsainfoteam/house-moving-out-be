import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { InspectionSlot } from 'generated/prisma/client';
import { InspectionSlotResDto } from 'src/move-out/dto/res/move-out-schedule-with-slots-res.dto';

export class InspectorResDto {
  @Expose()
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inspector UUID',
  })
  uuid: string;

  @Expose()
  @ApiProperty({
    example: 'John Doe',
    description: 'Inspector name',
  })
  name: string;

  @Expose()
  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Inspector email',
  })
  email: string;

  @Expose()
  @ApiProperty({
    example: '20250000',
    description: 'Inspector student number',
  })
  studentNumber: string;

  @Expose()
  @ApiProperty({
    description: 'Available inspection times',
    type: [InspectionSlotResDto],
  })
  @Transform(({ value }: { value: { inspectionSlot: InspectionSlot }[] }) => {
    const data = value.map((slot) => slot.inspectionSlot);
    console.log(value);
    return data;
  })
  availableSlots: InspectionSlotResDto[] | { inspectionSlot: InspectionSlot }[];

  @Exclude()
  availableSlotIds: string[];

  constructor(partial: Partial<InspectorResDto>) {
    Object.assign(this, partial);
  }
}
