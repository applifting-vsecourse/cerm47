import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { votePoll } from "@/features/quack/api/votePoll"
import { withVote } from "@/features/quack/lib/pollMath"

/**
 * Casting a vote changes the screen at once and is confirmed afterwards.
 *
 * - `scope` queues the votes of one poll, so the server sees quick clicks in
 *   click order and the last click is the one that stays.
 * - On failure the lists go back to what they showed before the click.
 * - Whatever happened, the lists are read again once no vote of this poll is
 *   left, so the counts on screen are the server's counts, not a guess.
 */
export function useVotePoll(quackId: string, pollId: string) {
  const queryClient = useQueryClient()
  const mutationKey = ["poll-vote", pollId] as const

  return useMutation({
    mutationKey,
    scope: { id: `poll-vote-${pollId}` },
    mutationFn: (optionId: string) => votePoll({ quackId, optionId }),
    onMutate: async (optionId) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      const previousLists = queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.lists() })
      // The quack can be in several cached lists (the feed and searches).
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
        quacks?.map((quack) =>
          quack.id === quackId && quack.poll
            ? { ...quack, poll: withVote(quack.poll, optionId) }
            : quack,
        ),
      )
      return { previousLists }
    },
    onError: (_error, _optionId, context) => {
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async () => {
      // This vote still counts as running here; more than one means another is queued.
      if (queryClient.isMutating({ mutationKey }) > 1) return
      await queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
    },
  })
}
