import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

export function QuackDeleteButton({ quackId }: { quackId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const deleteQuack = useDeleteQuack()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Delete quack"
        onClick={() => {
          deleteQuack.reset()
          setIsOpen(true)
        }}
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this quack?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>

          {deleteQuack.error ? (
            <Alert variant="destructive">
              <AlertDescription>{deleteQuack.error.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={deleteQuack.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteQuack.isPending}
              onClick={() => deleteQuack.mutate(quackId, { onSuccess: () => setIsOpen(false) })}
            >
              {deleteQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
