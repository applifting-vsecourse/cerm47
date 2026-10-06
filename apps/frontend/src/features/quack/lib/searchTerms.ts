// Length limits of a search term. They mirror the server-side DTO
// (MinLength(3), MaxLength(100)).
export const SEARCH_MIN_LENGTH = 3
export const SEARCH_MAX_LENGTH = 100

// Splits a search string into its words; blank input gives no terms.
export const searchTerms = (search: string | undefined): string[] =>
  (search ?? "").split(/\s+/).filter(Boolean)

// The term to actually search for: trimmed, and only once it is long enough.
// Anything shorter shows the full feed, so we don't query on every first letter.
export const activeSearch = (search: string | undefined): string | undefined => {
  const trimmed = (search ?? "").trim()
  return trimmed.length >= SEARCH_MIN_LENGTH ? trimmed : undefined
}
