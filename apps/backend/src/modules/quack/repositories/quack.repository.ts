import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import {
  mapPrismaPollToDomain,
  pollInclude,
  PrismaPollForViewer,
} from '@/modules/quack/repositories/poll.mapper';
import { Injectable } from '@nestjs/common';

export type DeleteQuackResult =
  | { status: 'not_found' }
  | { status: 'ok'; wasTombstoned: boolean; replyCount: number };

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser | null;
    poll?: PrismaPollForViewer | null;
    _count?: { replies: number };
  },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  isDeleted: quack.deletedAt !== null,
  replyCount: quack._count?.replies ?? 0,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
  poll: quack.poll ? mapPrismaPollToDomain(quack.poll) : null,
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every term must match (case-insensitive "contains") the quack text, the
   * author's name or the author's username. Prisma escapes `%` and `_` in
   * `contains`, so user input is never treated as a wildcard.
   */
  async getQuacks(
    viewerId: string,
    terms: string[] = [],
    authorId?: string,
  ): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: {
        userId: authorId,
        AND: terms.map((term) => ({
          OR: [
            { text: { contains: term, mode: 'insensitive' as const } },
            {
              user: { name: { contains: term, mode: 'insensitive' as const } },
            },
            {
              user: {
                username: { contains: term, mode: 'insensitive' as const },
              },
            },
          ],
        })),
      },
      include: {
        user: true,
        poll: { include: pollInclude(viewerId) },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: QuackMood;
    pollOptions?: string[];
    userId: string;
  }): Promise<Quack> {
    const { pollOptions } = createQuackData;
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        // quack, poll and options are written together or not at all
        poll: pollOptions
          ? {
              create: {
                options: {
                  create: pollOptions.map((text, position) => ({
                    text,
                    position,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        user: true,
        poll: { include: pollInclude(createQuackData.userId) },
        _count: { select: { replies: true } },
      },
    });
    return mapPrismaQuackToDomain(quack);
  }

  async getQuackById(id: string): Promise<Quack | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id },
      include: { user: true },
    });
    return quack ? mapPrismaQuackToDomain(quack) : null;
  }

  /**
   * The one place a quack is deleted. A quack nobody replied to is removed
   * completely. A quack with replies stays as an anonymous tombstone so the
   * replies keep their place: text, mood, author and poll are wiped in the
   * same transaction.
   *
   * The quack row is locked FOR UPDATE. A reply being added holds it FOR SHARE,
   * so it is either saved first (and counted below) or waits and finds the
   * quack gone.
   */
  async deleteQuack(id: string): Promise<DeleteQuackResult> {
    return this.prisma.$transaction(async (tx): Promise<DeleteQuackResult> => {
      const [locked] = await tx.$queryRaw<
        { deletedAt: Date | null }[]
      >`SELECT "deletedAt" FROM "quack" WHERE "id" = ${id} FOR UPDATE`;
      if (!locked || locked.deletedAt) return { status: 'not_found' };

      const replyCount = await tx.reply.count({ where: { quackId: id } });
      if (replyCount === 0) {
        await tx.quack.delete({ where: { id } });
        return { status: 'ok', wasTombstoned: false, replyCount };
      }

      // Options and votes go with the poll (cascade).
      await tx.poll.deleteMany({ where: { quackId: id } });
      await tx.quack.update({
        where: { id },
        data: { text: '', mood: null, userId: null, deletedAt: new Date() },
      });
      return { status: 'ok', wasTombstoned: true, replyCount };
    });
  }
}
