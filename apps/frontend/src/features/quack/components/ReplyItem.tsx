import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Reply } from "@/features/quack/api/quackSchemas"
import { MoodBadge } from "@/features/quack/components/MoodBadge"
import { ReplyDeleteButton } from "@/features/quack/components/ReplyDeleteButton"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { initialsOf } from "@/features/quack/lib/initials"

type ReplyItemProps = {
  quackId: string
  reply: Reply
  currentUserId?: string
  /** A moderator can delete any reply. */
  isAdmin?: boolean
}

export function ReplyItem({ quackId, reply, currentUserId, isAdmin }: ReplyItemProps) {
  const isWriter = reply.user.id === currentUserId

  return (
    <li className="flex gap-3">
      <Avatar className="size-8">
        <AvatarFallback>{initialsOf(reply.user.name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={reply.user.name} /> <UsersUserName username={reply.user.username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time>
          {reply.mood ? <MoodBadge mood={reply.mood} /> : null}
        </div>
        <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
      </div>

      {isWriter || isAdmin ? (
        <ReplyDeleteButton
          quackId={quackId}
          replyId={reply.id}
        />
      ) : null}
    </li>
  )
}
