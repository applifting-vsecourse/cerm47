import { QuackMood } from '@/generated/prisma/client';
import { Reply } from '@/modules/quack/domain/reply';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuackUserDto } from './quack.response.dto';

export class ReplyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional({ enum: QuackMood, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  static fromDomain(reply: Reply): ReplyResponseDto {
    return {
      id: reply.id,
      text: reply.text,
      mood: reply.mood,
      createdAt: reply.createdAt,
      user: {
        id: reply.user.id,
        name: reply.user.name,
        username: reply.user.username,
      },
    };
  }
}
