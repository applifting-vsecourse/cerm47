import type { Poll } from "@/features/quack/api/quackSchemas"

/** Whole-number share of the votes. The shares of a poll may not add up to exactly 100. */
export function percentOf(votes: number, total: number): number {
  return total === 0 ? 0 : Math.round((votes / total) * 100)
}

/**
 * The poll as it will look once the viewer's vote for `optionId` is counted:
 * the old pick loses a vote, the new one gains it, the total grows only for a
 * first vote. Used to update the screen before the server answers; the
 * server's own counts replace it afterwards.
 */
export function withVote(poll: Poll, optionId: string): Poll {
  const isKnownOption = poll.options.some((option) => option.id === optionId)
  if (poll.isClosed || !isKnownOption || poll.myOptionId === optionId) return poll

  return {
    ...poll,
    myOptionId: optionId,
    totalVotes: poll.myOptionId === null ? poll.totalVotes + 1 : poll.totalVotes,
    options: poll.options.map((option) => {
      if (option.id === optionId) return { ...option, votes: option.votes + 1 }
      if (option.id === poll.myOptionId) return { ...option, votes: option.votes - 1 }
      return option
    }),
  }
}
