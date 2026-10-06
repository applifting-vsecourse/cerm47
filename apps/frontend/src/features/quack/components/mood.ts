import type { QuackMood } from "@/features/quack/api/quackSchemas"

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
