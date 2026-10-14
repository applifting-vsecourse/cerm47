import { useState } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import type { Poll } from "@/features/quack/api/quackSchemas"
import { ClosePollDialog } from "@/features/quack/components/ClosePollDialog"
import { useClosePoll } from "@/features/quack/hooks/useClosePoll"
import { useVotePoll } from "@/features/quack/hooks/useVotePoll"
import { percentOf } from "@/features/quack/lib/pollMath"

type PollViewProps = {
  quackId: string
  poll: Poll
  /** Only the author of the quack can close its poll. */
  isAuthor: boolean
}

function votesLabel(total: number): string {
  if (total === 0) return "No votes yet"
  return total === 1 ? "1 vote" : `${total} votes`
}

export function PollView({ quackId, poll, isAuthor }: PollViewProps) {
  const vote = useVotePoll(quackId, poll.id)
  const close = useClosePoll(quackId)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)

  // Radix reports "" when the current pick is pressed again; a vote can only
  // be moved, not withdrawn, so that and a closed poll send nothing.
  const handleValueChange = (optionId: string) => {
    if (optionId === "" || poll.isClosed || optionId === poll.myOptionId) return
    vote.mutate(optionId)
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        aria-label="Poll options"
        value={poll.myOptionId ?? ""}
        onValueChange={handleValueChange}
        className="w-full flex-col items-stretch"
      >
        {poll.options.map((option) => {
          const percent = percentOf(option.votes, poll.totalVotes)
          const isMine = option.id === poll.myOptionId
          return (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              className="relative h-auto min-h-9 w-full justify-between gap-3 overflow-hidden py-1.5"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-primary/20"
                style={{ width: `${percent}%` }}
              />
              <span
                className={isMine ? "relative flex items-center gap-2 font-semibold" : "relative"}
              >
                {isMine ? <Check aria-hidden="true" /> : null}
                {option.text}
              </span>
              <span className="relative text-muted-foreground">
                {option.votes} · {percent}%
              </span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>

      {vote.isError ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {vote.error instanceof PollClosedError
            ? vote.error.message
            : "Couldn't save your vote. Try again."}
        </p>
      ) : null}

      {close.isError ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          Couldn&apos;t close the poll. Try again.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{votesLabel(poll.totalVotes)}</span>
        {poll.isClosed ? <span>Closed</span> : null}
        {isAuthor && !poll.isClosed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setIsCloseDialogOpen(true)}
          >
            Close poll
          </Button>
        ) : null}
      </div>

      <ClosePollDialog
        isOpen={isCloseDialogOpen}
        isPending={close.isPending}
        onOpenChange={setIsCloseDialogOpen}
        // The dialog stays up while the request runs and goes away either way,
        // so the answer is read from the poll (closed) or the message under it.
        onConfirm={() => close.mutate(undefined, { onSettled: () => setIsCloseDialogOpen(false) })}
      />
    </div>
  )
}
