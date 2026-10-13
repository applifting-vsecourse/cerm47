import { z } from "zod"

// Shared by the quack feed (a quack's mood) and the auth feature (the user's
// default mood), which may not import from each other.
export const quackMoodSchema = z.enum(["happy", "sad", "angry", "silly"])

export type QuackMood = z.infer<typeof quackMoodSchema>

// A form field holds "" while no mood is chosen.
export const NO_MOOD = ""
export const moodValueSchema = z.union([quackMoodSchema, z.literal(NO_MOOD)])
export type MoodValue = z.infer<typeof moodValueSchema>

export const MOOD_OPTIONS: { value: QuackMood; label: string; emoji: string }[] = [
  { value: "happy", label: "Happy", emoji: "🙂" },
  { value: "sad", label: "Sad", emoji: "🙁" },
  { value: "angry", label: "Angry", emoji: "😠" },
  { value: "silly", label: "Silly", emoji: "😜" },
]

export function moodLabel(mood: QuackMood) {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.label ?? mood
}

export function moodEmoji(mood: QuackMood) {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.emoji ?? ""
}
