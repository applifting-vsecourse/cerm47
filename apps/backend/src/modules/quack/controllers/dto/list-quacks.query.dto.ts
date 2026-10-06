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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  q?: string;
}
