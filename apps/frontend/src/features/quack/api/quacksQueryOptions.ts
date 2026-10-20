import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"
import { activeSearch } from "@/features/quack/lib/searchTerms"

// `search` is the raw term; blank or shorter than the minimum means the full feed.
// `mine` limits the feed to the signed-in user's own quacks.
export const quacksQueryOptions = (search?: string, isMine = false) => {
  const q = activeSearch(search)
  return queryOptions({
    queryKey: quackKeys.list(q, isMine),
    queryFn: async () =>
      quacksSchema.parse(
        await api
          .get("quacks", {
            searchParams: { ...(q ? { q } : {}), ...(isMine ? { mine: true } : {}) },
          })
          .json(),
      ),
    // Keep the previous results on screen while the next search loads, so the list doesn't flash.
    placeholderData: keepPreviousData,
  })
}
