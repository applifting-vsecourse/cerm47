import { useCallback, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { activeSearch, SEARCH_MAX_LENGTH } from "@/features/quack/lib/searchTerms"

const quacksSearchParamsSchema = z.object({
  // A bad or over-long `q` in a hand-edited URL falls back to the full feed.
  q: z.string().max(SEARCH_MAX_LENGTH).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
  validateSearch: quacksSearchParamsSchema,
})

function QuacksPage() {
  const { q = "" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions(q))
  // Remounting the search box drops a half-typed term and its pending debounce.
  const [searchBoxKey, setSearchBoxKey] = useState(0)

  // `replace` keeps every keystroke pause out of the back-button history.
  const setSearch = useCallback(
    (next: string) => {
      void navigate({ search: { q: next.trim() ? next : undefined }, replace: true })
    },
    [navigate],
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          className="mb-6"
          onPosted={() => {
            setSearch("")
            setSearchBoxKey((key) => key + 1)
          }}
        />

        <QuackSearch
          key={searchBoxKey}
          className="mb-4"
          value={q}
          onChange={setSearch}
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          // Stale placeholder results must not pass for the new term's answer.
          isLoading={quacksQuery.isLoading || quacksQuery.isPlaceholderData}
          error={quacksQuery.error ?? undefined}
          searchTerm={activeSearch(q)}
          onClearSearch={() => setSearch("")}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
        />
      </section>
    </>
  )
}
