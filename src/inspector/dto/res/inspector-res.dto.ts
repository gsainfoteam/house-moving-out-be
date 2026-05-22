import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { Gender, InspectionSlot } from 'generated/prisma/client';
import { InspectorWithSlots } from '@lib/database';
import { InspectionSlotResDto } from 'src/schedule/dto/res/move-out-schedule-with-slots-res.dto';

@Exclude()
export class InspectorResDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inspector UUID',
  })
  @Expose()
  uuid!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Inspector name',
  })
  @Expose()
  name!: string;

  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Inspector email',
  })
  @Expose()
  email!: string;

  @ApiProperty({
    example: '20250000',
    description: 'Inspector student number',
  })
  @Expose()
  studentNumber!: string;

  @ApiProperty({
    example: Gender.MALE,
    description: 'Inspector gender',
    enum: Gender,
  })
  @Expose()
  gender!: Gender;

  @ApiPropertyOptional({
    example: false,
    description: 'Is temporary inspector',
  })
  @Expose()
  isTemporary?: boolean;

  @ApiProperty({
    description: 'Available inspection times',
    type: [InspectionSlotResDto],
  })
  @Transform(({ value }: { value: { inspectionSlot: InspectionSlot }[] }) =>
    value.map((slot) => slot.inspectionSlot),
  )
  @Expose()
  availableSlots!: InspectionSlotResDto[];

  constructor(partial: InspectorWithSlots) {
    Object.assign(this, partial);
    if (partial.schedules && partial.schedules.length > 0) {
      this.isTemporary = partial.schedules[0].isTemporary;
    }
  }
}
