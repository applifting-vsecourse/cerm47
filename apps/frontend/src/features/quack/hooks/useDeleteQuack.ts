import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteQuack(id),
    onSuccess: async () => {
      // Refresh every list (All, Mine, any search) so the quack disappears.
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
