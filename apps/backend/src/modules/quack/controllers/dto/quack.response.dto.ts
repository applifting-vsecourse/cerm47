import { QuackMood } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/poll';
import { Quack } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class PollOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'Votes for this option, counted on every read' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    description: 'A closed poll takes no votes and never reopens',
  })
  isClosed!: boolean;

  @ApiProperty()
  totalVotes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "The signed-in user's own pick; other people's picks are never exposed",
  })
  myOptionId!: string | null;

  @ApiProperty({
    type: [PollOptionDto],
    description: 'In the order the author wrote them',
  })
  options!: PollOptionDto[];

  static fromDomain(poll: Poll): PollResponseDto {
    return {
      id: poll.id,
      isClosed: poll.isClosed,
      totalVotes: poll.totalVotes,
      myOptionId: poll.myOptionId,
      options: poll.options.map((option) => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
      })),
    };
  }
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional({ enum: QuackMood, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({ type: PollResponseDto, nullable: true })
  poll!: PollResponseDto | null;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      poll: quack.poll ? PollResponseDto.fromDomain(quack.poll) : null,
    };
  }
}
