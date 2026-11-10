import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { repliesSchema } from "@/features/quack/api/quackSchemas"

// Oldest first, as the server returns them. Also works for a tombstone.
export const repliesQueryOptions = (quackId: string) =>
  queryOptions({
    queryKey: quackKeys.replies(quackId),
    queryFn: async () =>
      repliesSchema.parse(await api.get(`quacks/${encodeURIComponent(quackId)}/replies`).json()),
  })
