import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"
import { activeSearch } from "@/features/quack/lib/searchTerms"

// `search` is the raw term; blank or shorter than the minimum means the full feed.
export const quacksQueryOptions = (search?: string) => {
  const q = activeSearch(search)
  return queryOptions({
    queryKey: quackKeys.list(q),
    queryFn: async () =>
      quacksSchema.parse(await api.get("quacks", { searchParams: q ? { q } : undefined }).json()),
    // Keep the previous results on screen while the next search loads, so the list doesn't flash.
    placeholderData: keepPreviousData,
  })
}
