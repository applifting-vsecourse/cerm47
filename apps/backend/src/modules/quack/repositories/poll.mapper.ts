import { Prisma } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/poll';

/**
 * What a poll needs to be shown to one viewer: options in the author's order
 * with their vote counts (counted by the database on every read, never stored),
 * and the viewer's own vote only.
 */
// No return type on purpose: the narrow literal type is what lets Prisma infer the payload.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const pollInclude = (viewerId: string) =>
  ({
    options: {
      orderBy: { position: 'asc' },
      include: { _count: { select: { votes: true } } },
    },
    votes: { where: { userId: viewerId }, select: { optionId: true } },
  }) satisfies Prisma.PollInclude;

export type PrismaPollForViewer = Prisma.PollGetPayload<{
  include: ReturnType<typeof pollInclude>;
}>;

export const mapPrismaPollToDomain = (poll: PrismaPollForViewer): Poll => ({
  id: poll.id,
  isClosed: poll.closedAt !== null,
  totalVotes: poll.options.reduce(
    (sum, option) => sum + option._count.votes,
    0,
  ),
  myOptionId: poll.votes[0]?.optionId ?? null,
  options: poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  })),
});
