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

type DeleteConfirmButtonProps = {
  ariaLabel: string
  title: string
  description: string
  isPending: boolean
  error: Error | null
  /** Called when the dialog opens, to clear an earlier failure. */
  onOpen: () => void
  /** Runs the delete; call `close` once it has succeeded. */
  onConfirm: (close: () => void) => void
}

/** A trash button that asks first. Shared by deleting a quack and deleting a reply. */
export function DeleteConfirmButton({
  ariaLabel,
  title,
  description,
  isPending,
  error,
  onOpen,
  onConfirm,
}: DeleteConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={ariaLabel}
        onClick={() => {
          onOpen()
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => onConfirm(() => setIsOpen(false))}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
