import { DeleteConfirmButton } from "@/features/quack/components/DeleteConfirmButton"
import { useDeleteReply } from "@/features/quack/hooks/useDeleteReply"

export function ReplyDeleteButton({ quackId, replyId }: { quackId: string; replyId: string }) {
  const deleteReply = useDeleteReply(quackId)

  return (
    <DeleteConfirmButton
      ariaLabel="Delete reply"
      title="Delete this reply?"
      description="This can't be undone."
      isPending={deleteReply.isPending}
      error={deleteReply.error}
      onOpen={() => deleteReply.reset()}
      onConfirm={(close) => deleteReply.mutate(replyId, { onSuccess: close })}
    />
  )
}
