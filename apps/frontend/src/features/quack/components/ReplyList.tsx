import { useQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { QuackMood } from "@/lib/mood"

import { repliesQueryOptions } from "@/features/quack/api/repliesQueryOptions"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyItem } from "@/features/quack/components/ReplyItem"

type ReplyListProps = {
  quackId: string
  /** A deleted quack keeps its replies but takes no new ones. */
  isTombstone: boolean
  currentUserId?: string
  isAdmin?: boolean
  defaultMood?: QuackMood | null
}

/** The replies of one quack, oldest first, with the form to add one below. */
export function ReplyList({
  quackId,
  isTombstone,
  currentUserId,
  isAdmin,
  defaultMood,
}: ReplyListProps) {
  const repliesQuery = useQuery(repliesQueryOptions(quackId))
  const replies = repliesQuery.data

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3">
      {repliesQuery.isLoading ? (
        <div
          role="status"
          aria-label="Loading replies"
          className="flex items-center justify-center py-4 text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : null}

      {repliesQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{repliesQuery.error.message}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void repliesQuery.refetch()}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {replies?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No replies yet. Be the first to answer.</p>
      ) : null}

      {replies && replies.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              quackId={quackId}
              reply={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      ) : null}

      {isTombstone ? null : (
        <ReplyForm
          quackId={quackId}
          defaultMood={defaultMood}
        />
      )}
    </div>
  )
}
