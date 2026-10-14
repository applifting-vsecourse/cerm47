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

import { PollFields } from "@/features/quack/components/PollFields"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"
import { emptyPoll, pollFormSchema } from "@/features/quack/lib/pollOptions"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  mood: moodValueSchema,
  // null = a plain quack; an object = a quack with a poll
  poll: pollFormSchema.nullable(),
})

type FormValues = z.infer<typeof schema>

type QuackFormProps = {
  className?: string
  /** The mood chosen on the Settings page; the form starts with it selected. */
  defaultMood?: QuackMood | null
  /** Called after a quack is posted successfully. */
  onPosted?: () => void
}

export function QuackForm({ className, defaultMood, onPosted }: QuackFormProps) {
  const addQuack = useAddQuack()
  // reset() after posting returns to this mood.
  const initialMood = defaultMood ?? NO_MOOD
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: initialMood, poll: null },
  })

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0
  const poll = useWatch({ control: form.control, name: "poll" })

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood === NO_MOOD ? undefined : values.mood,
        pollOptions: values.poll?.options.map((option) => option.text),
      },
      {
        onSuccess: () => {
          form.reset()
          onPosted?.()
        },
      },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New quack</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Quack something..."
                  disabled={addQuack.isPending}
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
                  disabled={addQuack.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {poll ? <PollFields isDisabled={addQuack.isPending} /> : null}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={addQuack.isPending}
            onClick={() => form.setValue("poll", poll ? null : emptyPoll())}
          >
            {poll ? "Remove poll" : "Add a poll"}
          </Button>
          <span
            className={cn(
              "text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}
