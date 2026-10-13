import { z } from "zod"

import { moodValueSchema } from "@/lib/mood"

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30
export const BIO_MAX_LENGTH = 160

// Mirrors the server-side rules (BetterAuth username plugin and the profile
// field validators) so the user is told before the request is made — the
// server still validates independently.
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Display name is required"),
  username: z
    .string()
    .trim()
    .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
    .max(USERNAME_MAX_LENGTH, `Username can be at most ${USERNAME_MAX_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9_.]+$/, "Use only letters, numbers, dots and underscores"),
  bio: z.string().trim().max(BIO_MAX_LENGTH, `Keep your bio under ${BIO_MAX_LENGTH} characters`),
  defaultMood: moodValueSchema,
})

export type ProfileValues = z.infer<typeof profileSchema>
