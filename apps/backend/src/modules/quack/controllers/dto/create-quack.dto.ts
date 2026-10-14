import { QuackMood } from '@/generated/prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreatePollDto } from './create-poll.dto';

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiPropertyOptional({
    description: 'Mood of the quack',
    enum: QuackMood,
  })
  @IsOptional()
  @IsEnum(QuackMood)
  mood?: QuackMood;

  @ApiPropertyOptional({
    description: 'Attach a poll: people can pick one of the options',
    type: CreatePollDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePollDto)
  poll?: CreatePollDto;
}
