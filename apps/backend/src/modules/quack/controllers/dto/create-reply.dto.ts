import { QuackMood } from '@/generated/prisma/client';
import { QUACK_TEXT_MAX_LENGTH } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReplyDto {
  @ApiProperty({
    description: 'Body of the reply. Trimmed, not blank.',
    example: 'Agreed!',
    maxLength: QUACK_TEXT_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(QUACK_TEXT_MAX_LENGTH)
  text!: string;

  @ApiPropertyOptional({ description: 'Mood of the reply', enum: QuackMood })
  @IsOptional()
  @IsEnum(QuackMood)
  mood?: QuackMood;
}
