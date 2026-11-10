import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteReply } from "@/features/quack/api/deleteReply"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useDeleteReply(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (replyId: string) => deleteReply({ quackId, replyId }),
    onSuccess: async () => {
      // Deleting the last reply of a tombstone removes the tombstone from the feed too.
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
