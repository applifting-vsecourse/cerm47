import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ClosePollDialogProps = {
  isOpen: boolean
  isPending: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: () => void
}

export function ClosePollDialog({
  isOpen,
  isPending,
  onOpenChange,
  onConfirm,
}: ClosePollDialogProps) {
  return (
    <Dialog
      open={isOpen}
      // Escape and a click outside must not hide a request that is still running.
      onOpenChange={(isNextOpen) => {
        if (!isPending) onOpenChange(isNextOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this poll?</DialogTitle>
          <DialogDescription>
            Voting stops and the counts become final. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Close poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
