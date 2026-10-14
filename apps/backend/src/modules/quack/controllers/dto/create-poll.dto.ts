import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_OPTION_MAX_LENGTH = 80;

export class CreatePollDto {
  @ApiProperty({
    description:
      'Answers to choose from, in display order. Trimmed, not blank, unique ignoring case.',
    example: ['Pizza', 'Sushi', 'Burgers'],
    type: [String],
    minItems: POLL_MIN_OPTIONS,
    maxItems: POLL_MAX_OPTIONS,
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((option: unknown) =>
          typeof option === 'string' ? option.trim() : option,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(POLL_MIN_OPTIONS)
  @ArrayMaxSize(POLL_MAX_OPTIONS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(POLL_OPTION_MAX_LENGTH, { each: true })
  @ArrayUnique((option: string) => option.toLowerCase())
  options!: string[];
}
