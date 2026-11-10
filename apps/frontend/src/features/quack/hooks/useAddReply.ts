import { useMutation, useQueryClient } from "@tanstack/react-query"

import { addReply } from "@/features/quack/api/addReply"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { QuackMood } from "@/features/quack/api/quackSchemas"

// The hook owns the mutation only — form state belongs to react-hook-form in the component.
export function useAddReply(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { text: string; mood?: QuackMood }) => addReply({ quackId, ...input }),
    onSuccess: async () => {
      // The feed shows the reply count and the list shows the reply itself.
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
