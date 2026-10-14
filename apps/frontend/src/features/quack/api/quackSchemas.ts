import { z } from "zod"

import { quackMoodSchema, type QuackMood } from "@/lib/mood"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number(),
})

export const pollSchema = z.object({
  id: z.string(),
  isClosed: z.boolean(),
  totalVotes: z.number(),
  // The viewer's own pick; other people's picks are never sent.
  myOptionId: z.string().nullable(),
  options: z.array(pollOptionSchema),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type Poll = z.infer<typeof pollSchema>

export type { QuackMood }
