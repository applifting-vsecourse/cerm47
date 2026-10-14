import { Plus, X } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS } from "@/features/quack/lib/pollOptions"

// Must sit inside the <Form> of a form whose values have `poll: { options: { text }[] }`.
export function PollFields({ isDisabled }: { isDisabled?: boolean }) {
  const { control } = useFormContext<{ poll: { options: { text: string }[] } }>()
  const { fields, append, remove } = useFieldArray({ control, name: "poll.options" })

  return (
    <fieldset
      className="flex flex-col gap-3"
      disabled={isDisabled}
    >
      <legend className="sr-only">Poll options</legend>
      {fields.map((field, index) => (
        <FormField
          key={field.id}
          control={control}
          name={`poll.options.${index}.text`}
          render={({ field: input }) => (
            <FormItem>
              <FormLabel>Option {index + 1}</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    placeholder={index === 0 ? "Pizza" : index === 1 ? "Sushi" : undefined}
                    {...input}
                  />
                </FormControl>
                {fields.length > POLL_MIN_OPTIONS ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      {fields.length < POLL_MAX_OPTIONS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => append({ text: "" })}
        >
          <Plus />
          Add option
        </Button>
      ) : null}
    </fieldset>
  )
}
