import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleResDto {
  @ApiProperty({
    description: 'The UUID of the newly created article',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;
}
