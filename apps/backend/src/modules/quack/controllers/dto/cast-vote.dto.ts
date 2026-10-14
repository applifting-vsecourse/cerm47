import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CastVoteDto {
  @ApiProperty({
    description: 'The option to vote for. Replaces your earlier vote, if any.',
  })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
