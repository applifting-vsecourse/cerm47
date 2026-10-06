import { Highlight } from "@/features/quack/components/Highlight"

type UsersUserNameProps = {
  username: string
  terms?: string[]
}

export function UsersUserName({ username, terms }: UsersUserNameProps) {
  return (
    <span className="text-sm text-muted-foreground">
      @
      <Highlight
        text={username}
        terms={terms}
      />
    </span>
  )
}
