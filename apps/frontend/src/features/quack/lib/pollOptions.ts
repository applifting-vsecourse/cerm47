import { z } from "zod"

// Mirror the server-side DTO (2–6 options, 1–80 characters, unique ignoring
// case); the server still validates independently.
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 6
export const POLL_OPTION_MAX_LENGTH = 80

export const pollFormSchema = z
  .object({
    options: z
      .array(
        z.object({
          text: z
            .string()
            .trim()
            .min(1, "Write an answer")
            .max(POLL_OPTION_MAX_LENGTH, `Keep it under ${POLL_OPTION_MAX_LENGTH} characters`),
        }),
      )
      .min(POLL_MIN_OPTIONS)
      .max(POLL_MAX_OPTIONS),
  })
  .superRefine(({ options }, context) => {
    const seen = new Set<string>()
    options.forEach((option, index) => {
      const key = option.text.toLowerCase()
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "text"],
          message: "Options must be different",
        })
      }
      seen.add(key)
    })
  })

export const emptyPoll = () => ({ options: [{ text: "" }, { text: "" }] })
