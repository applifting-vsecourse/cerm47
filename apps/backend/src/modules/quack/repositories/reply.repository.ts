import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Reply as PrismaReply,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { QuackMood } from '@/modules/quack/domain/quack';
import { Reply } from '@/modules/quack/domain/reply';
import { Injectable } from '@nestjs/common';

export type CreateReplyResult =
  { status: 'no_quack' | 'deleted' } | { status: 'ok'; reply: Reply };

export type DeleteReplyResult =
  | { status: 'no_reply' | 'not_author' }
  | { status: 'ok'; didPurgeQuack: boolean };

const mapPrismaReplyToDomain = (
  reply: PrismaReply & { user: PrismaUser },
): Reply => ({
  id: reply.id,
  text: reply.text,
  mood: reply.mood,
  createdAt: reply.createdAt,
  user: {
    id: reply.user.id,
    name: reply.user.name,
    username: reply.user.username ?? '',
  },
});

@Injectable()
export class ReplyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Oldest first. Null means there is no such quack; a tombstone still has its replies. */
  async getReplies(quackId: string): Promise<Reply[] | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: {
        replies: {
          include: { user: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    return quack ? quack.replies.map(mapPrismaReplyToDomain) : null;
  }

  /**
   * The quack row is locked FOR SHARE. Deleting a quack needs it exclusively,
   * so a reply is either saved before the delete (which then leaves a
   * tombstone) or sees the quack gone or deleted and is rejected.
   */
  async createReply(input: {
    quackId: string;
    userId: string;
    text: string;
    mood?: QuackMood;
  }): Promise<CreateReplyResult> {
    return this.prisma.$transaction(async (tx): Promise<CreateReplyResult> => {
      const [locked] = await tx.$queryRaw<
        { deletedAt: Date | null }[]
      >`SELECT "deletedAt" FROM "quack" WHERE "id" = ${input.quackId} FOR SHARE`;
      if (!locked) return { status: 'no_quack' };
      if (locked.deletedAt) return { status: 'deleted' };

      const reply = await tx.reply.create({
        data: {
          text: input.text,
          mood: input.mood,
          quackId: input.quackId,
          userId: input.userId,
        },
        include: { user: true },
      });
      return { status: 'ok', reply: mapPrismaReplyToDomain(reply) };
    });
  }

  /**
   * The reply's writer or an admin deletes it. The quack row is locked FOR
   * UPDATE first, so two replies deleted at the same moment under a tombstone
   * cannot both see "another one is left" and leave an empty tombstone behind.
   */
  async deleteReply(
    quackId: string,
    replyId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<DeleteReplyResult> {
    return this.prisma.$transaction(async (tx): Promise<DeleteReplyResult> => {
      const [locked] = await tx.$queryRaw<
        { deletedAt: Date | null }[]
      >`SELECT "deletedAt" FROM "quack" WHERE "id" = ${quackId} FOR UPDATE`;
      if (!locked) return { status: 'no_reply' };

      const reply = await tx.reply.findFirst({
        where: { id: replyId, quackId },
        select: { userId: true },
      });
      if (!reply) return { status: 'no_reply' };
      if (reply.userId !== userId && !isAdmin) return { status: 'not_author' };

      await tx.reply.delete({ where: { id: replyId } });

      if (!locked.deletedAt) return { status: 'ok', didPurgeQuack: false };
      // A tombstone exists only for its replies: the last one takes it along.
      const left = await tx.reply.count({ where: { quackId } });
      if (left > 0) return { status: 'ok', didPurgeQuack: false };
      await tx.quack.delete({ where: { id: quackId } });
      return { status: 'ok', didPurgeQuack: true };
    });
  }
}
