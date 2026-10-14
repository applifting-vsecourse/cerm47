import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/poll';
import {
  mapPrismaPollToDomain,
  pollInclude,
} from '@/modules/quack/repositories/poll.mapper';
import { Injectable } from '@nestjs/common';

export type CastVoteResult =
  | { status: 'no_poll' | 'closed' | 'bad_option' }
  | { status: 'ok'; kind: 'first' | 'changed' | 'unchanged'; poll: Poll };

export type ClosePollResult =
  | { status: 'no_poll' | 'not_author' }
  | { status: 'ok'; didClose: boolean; poll: Poll };

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class PollRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sets the user's vote on the quack's poll. One row per (poll, user) is the
   * database's rule; this method only decides what to do before it.
   *
   * The poll row is locked FOR SHARE for the whole transaction. Votes share
   * that lock, but closing a poll needs it exclusively, so a vote is either
   * counted before the poll closes or sees it closed and is rejected.
   */
  async castVote(
    quackId: string,
    userId: string,
    optionId: string,
  ): Promise<CastVoteResult> {
    try {
      return await this.castVoteOnce(quackId, userId, optionId);
    } catch (error) {
      // Two first votes from the same user at once: one insert loses to the
      // unique key. The failed transaction is gone, so run it again; the
      // second pass sees the winner's vote and switches it.
      if (!isUniqueViolation(error)) throw error;
      return this.castVoteOnce(quackId, userId, optionId);
    }
  }

  private castVoteOnce(
    quackId: string,
    userId: string,
    optionId: string,
  ): Promise<CastVoteResult> {
    return this.prisma.$transaction(async (tx): Promise<CastVoteResult> => {
      const [locked] = await tx.$queryRaw<
        { id: string; closedAt: Date | null }[]
      >`SELECT "id", "closedAt" FROM "poll" WHERE "quackId" = ${quackId} FOR SHARE`;
      if (!locked) return { status: 'no_poll' };
      if (locked.closedAt) return { status: 'closed' };

      const option = await tx.pollOption.findFirst({
        where: { id: optionId, pollId: locked.id },
        select: { id: true },
      });
      if (!option) return { status: 'bad_option' };

      const existing = await tx.pollVote.findUnique({
        where: { pollId_userId: { pollId: locked.id, userId } },
        select: { optionId: true },
      });
      const kind =
        existing === null
          ? 'first'
          : existing.optionId === optionId
            ? 'unchanged'
            : 'changed';
      if (kind !== 'unchanged') {
        await tx.pollVote.upsert({
          where: { pollId_userId: { pollId: locked.id, userId } },
          create: { pollId: locked.id, optionId, userId },
          update: { optionId },
        });
      }

      // Counted from the stored votes, including the one just written.
      const poll = await tx.poll.findUniqueOrThrow({
        where: { id: locked.id },
        include: pollInclude(userId),
      });
      return { status: 'ok', kind, poll: mapPrismaPollToDomain(poll) };
    });
  }

  /**
   * Closes the poll for good. Closing twice is not an error: `didClose` tells
   * the caller whether this call did it, so only one of them is logged.
   */
  async closePoll(quackId: string, userId: string): Promise<ClosePollResult> {
    const found = await this.prisma.poll.findUnique({
      where: { quackId },
      select: { id: true, quack: { select: { userId: true } } },
    });
    if (!found) return { status: 'no_poll' };
    if (found.quack.userId !== userId) return { status: 'not_author' };

    // Waits for votes in flight (they hold the row FOR SHARE), then closes.
    const { count } = await this.prisma.poll.updateMany({
      where: { id: found.id, closedAt: null },
      data: { closedAt: new Date() },
    });
    const poll = await this.prisma.poll.findUniqueOrThrow({
      where: { id: found.id },
      include: pollInclude(userId),
    });
    return {
      status: 'ok',
      didClose: count > 0,
      poll: mapPrismaPollToDomain(poll),
    };
  }
}
