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

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser;
    poll?: PrismaPollForViewer | null;
  },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
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
  async getQuacks(viewerId: string, terms: string[] = []): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: {
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
      },
    });
    return mapPrismaQuackToDomain(quack);
  }
}
