import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"
import { moodEmoji, moodLabel } from "@/lib/mood"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { Highlight } from "@/features/quack/components/Highlight"
import { PollView } from "@/features/quack/components/PollView"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackItemProps = { quack: Quack; terms?: string[]; currentUserId?: string }

export function QuackItem({ quack, terms, currentUserId }: QuackItemProps) {
  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
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
          {quack.mood ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {moodEmoji(quack.mood)} {moodLabel(quack.mood)}
            </span>
          ) : null}
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
            isAuthor={quack.userId === currentUserId}
          />
        ) : null}
      </div>
    </article>
  )
}
