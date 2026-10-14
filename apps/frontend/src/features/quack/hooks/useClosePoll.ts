import { useMutation, useQueryClient } from "@tanstack/react-query"

import { closePoll } from "@/features/quack/api/closePoll"
import { quackKeys } from "@/features/quack/api/quackKeys"

/**
 * Closing is final, so unlike voting nothing is guessed: the poll shows as
 * closed once the lists are read again after the server has confirmed. The
 * lists are also read after a failure, in case the poll changed meanwhile.
 */
export function useClosePoll(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => closePoll({ quackId }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
    },
  })
}
