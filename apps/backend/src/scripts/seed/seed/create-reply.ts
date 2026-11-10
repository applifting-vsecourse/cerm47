import { PrismaService } from '@/core/prisma/prisma.service';
import { Reply } from '@/generated/prisma/client';
import { QuackMood } from '@/modules/quack/domain/quack';

type CreateReplyParams = {
  quackId: string;
  userId: string;
  text: string;
  mood?: QuackMood;
  // Optional so the seed can spread replies over time, like the quacks.
  createdAt?: Date;
};

export async function createReply(
  prisma: PrismaService,
  params: CreateReplyParams,
): Promise<Reply> {
  const { quackId, userId, text, mood, createdAt } = params;

  return await prisma.reply.create({
    data: {
      text,
      mood,
      createdAt,
      quack: { connect: { id: quackId } },
      user: { connect: { id: userId } },
    },
  });
}
