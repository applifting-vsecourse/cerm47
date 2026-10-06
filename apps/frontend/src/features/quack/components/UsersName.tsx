import { Highlight } from "@/features/quack/components/Highlight"

type UsersNameProps = {
  name: string
  terms?: string[]
}

export function UsersName({ name, terms }: UsersNameProps) {
  return (
    <span className="font-semibold text-foreground">
      <Highlight
        text={name}
        terms={terms}
      />
    </span>
  )
}
