import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ListQuacksQueryDto {
  @ApiPropertyOptional({
    description:
      'Search term. Every word must appear (case-insensitive) in the quack text, the author name or the author username.',
    example: 'duck pond',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  // A blank term means "no search", so it must reach the validators as undefined.
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  q?: string;
}
