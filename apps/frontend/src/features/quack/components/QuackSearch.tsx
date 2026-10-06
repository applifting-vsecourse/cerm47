import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@/features/quack/lib/searchTerms"

const DEBOUNCE_MS = 300

type QuackSearchProps = {
  /** The committed search term (kept in the URL by the page). */
  value: string
  /** Called once the user pauses typing, or immediately on clear. */
  onChange: (value: string) => void
  className?: string
}

export function QuackSearch({ value, onChange, className }: QuackSearchProps) {
  const [draft, setDraft] = useState(value)
  // The last value we reported upward, so a stale prop doesn't overwrite
  // what the user is typing right now.
  const lastEmitted = useRef(value)

  // The page can change the term from outside (e.g. cleared after posting).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => {
    if (draft === lastEmitted.current) return
    const timer = setTimeout(() => {
      lastEmitted.current = draft
      onChange(draft)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, onChange])

  const clear = () => {
    lastEmitted.current = ""
    setDraft("")
    onChange("")
  }

  const trimmedLength = draft.trim().length
  const isTooShort = trimmedLength > 0 && trimmedLength < SEARCH_MIN_LENGTH

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="quack-search">Search quacks</Label>
      <div className="relative">
        <Input
          id="quack-search"
          type="search"
          autoComplete="off"
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="A word, a name or a username"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={cn("[&::-webkit-search-cancel-button]:hidden", draft ? "pr-10" : null)}
        />
        {draft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            onClick={clear}
            className="absolute top-0.5 right-0.5"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      {isTooShort ? (
        <p className="text-sm text-muted-foreground">
          Type at least {SEARCH_MIN_LENGTH} characters to search.
        </p>
      ) : null}
    </div>
  )
}
