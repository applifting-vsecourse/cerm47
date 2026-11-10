import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { MoodPicker } from "@/components/MoodPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { moodValueSchema, NO_MOOD, type QuackMood } from "@/lib/mood"
import { cn } from "@/lib/utils"

import { useAddReply } from "@/features/quack/hooks/useAddReply"
import { QUACK_TEXT_MAX_LENGTH, quackTextSchema } from "@/features/quack/lib/quackText"

const schema = z.object({
  text: quackTextSchema,
  mood: moodValueSchema,
})

type FormValues = z.infer<typeof schema>

type ReplyFormProps = {
  quackId: string
  /** The mood chosen on the Settings page; the form starts with it selected. */
  defaultMood?: QuackMood | null
  className?: string
}

export function ReplyForm({ quackId, defaultMood, className }: ReplyFormProps) {
  const addReply = useAddReply(quackId)
  // reset() after posting returns to this mood.
  const initialMood = defaultMood ?? NO_MOOD
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: initialMood },
  })

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addReply.mutate(
      { text: values.text, mood: values.mood === NO_MOOD ? undefined : values.mood },
      { onSuccess: () => form.reset() },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addReply.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addReply.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your reply</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Answer this quack..."
                  disabled={addReply.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mood</FormLabel>
              <FormControl>
                <MoodPicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={addReply.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "text-sm",
              length > QUACK_TEXT_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{QUACK_TEXT_MAX_LENGTH}
          </span>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={addReply.isPending}
          >
            {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Post reply
          </Button>
        </div>
      </form>
    </Form>
  )
}
