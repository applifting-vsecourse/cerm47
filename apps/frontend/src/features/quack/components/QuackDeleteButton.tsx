import { DeleteConfirmButton } from "@/features/quack/components/DeleteConfirmButton"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type QuackDeleteButtonProps = {
  quackId: string
  /** The text goes either way; the replies stay, and the dialog says so. */
  hasReplies?: boolean
}

export function QuackDeleteButton({ quackId, hasReplies = false }: QuackDeleteButtonProps) {
  const deleteQuack = useDeleteQuack()

  return (
    <DeleteConfirmButton
      ariaLabel="Delete quack"
      title="Delete this quack?"
      description={
        hasReplies
          ? "This can't be undone. Its text will be removed. Replies to it stay."
          : "This can't be undone."
      }
      isPending={deleteQuack.isPending}
      error={deleteQuack.error}
      onOpen={() => deleteQuack.reset()}
      onConfirm={(close) => deleteQuack.mutate(quackId, { onSuccess: close })}
    />
  )
}
