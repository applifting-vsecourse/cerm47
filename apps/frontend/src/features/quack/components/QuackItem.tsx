import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"
import type { QuackMood } from "@/lib/mood"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { Highlight } from "@/features/quack/components/Highlight"
import { MoodBadge } from "@/features/quack/components/MoodBadge"
import { PollView } from "@/features/quack/components/PollView"
import { QuackDeleteButton } from "@/features/quack/components/QuackDeleteButton"
import { ReplyList } from "@/features/quack/components/ReplyList"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { initialsOf } from "@/features/quack/lib/initials"

type QuackItemProps = {
  quack: Quack
  terms?: string[]
  /** Replies are for signed-in users only, so the landing page preview passes none. */
  currentUserId?: string
  isAdmin?: boolean
  defaultMood?: QuackMood | null
}

const replyLabel = (count: number) =>
  count === 0 ? "Reply" : count === 1 ? "1 reply" : `${count} replies`

export function QuackItem({ quack, terms, currentUserId, isAdmin, defaultMood }: QuackItemProps) {
  const [isReplyListOpen, setIsReplyListOpen] = useState(false)

  // The control and the list sit under the quack's content, inside its own card.
  const replies =
    currentUserId === undefined ? null : (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          aria-expanded={isReplyListOpen}
          onClick={() => setIsReplyListOpen((isOpen) => !isOpen)}
        >
          {replyLabel(quack.replyCount)}
        </Button>
        {isReplyListOpen ? (
          <ReplyList
            quackId={quack.id}
            isTombstone={quack.isDeleted}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            defaultMood={defaultMood}
          />
        ) : null}
      </>
    )

  // A tombstone has no author, text or poll left to show, only its replies.
  if (quack.isDeleted || !quack.user) {
    return (
      <article className="flex w-full flex-col gap-1 border-b border-border pt-2 pb-4 last:border-b-0">
        <p className="text-sm text-muted-foreground">This quack was deleted</p>
        {replies}
      </article>
    )
  }

  const { name, username } = quack.user
  const isAuthor = quack.userId === currentUserId

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback>{initialsOf(name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName
              name={name}
              terms={terms}
            />{" "}
            <UsersUserName
              username={username}
              terms={terms}
            />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
          {quack.mood ? <MoodBadge mood={quack.mood} /> : null}
        </div>
        <p className="text-sm break-words whitespace-pre-line">
          <Highlight
            text={quack.text}
            terms={terms}
          />
        </p>
        {quack.poll ? (
          <PollView
            quackId={quack.id}
            poll={quack.poll}
            isAuthor={isAuthor}
          />
        ) : null}
        {replies}
      </div>

      {isAuthor || isAdmin ? (
        <QuackDeleteButton
          quackId={quack.id}
          hasReplies={quack.replyCount > 0}
        />
      ) : null}
    </article>
  )
}
