import { moodEmoji, moodLabel, type QuackMood } from "@/lib/mood"

/** The small mood tag on a quack or a reply. */
export function MoodBadge({ mood }: { mood: QuackMood }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
      {moodEmoji(mood)} {moodLabel(mood)}
    </span>
  )
}
