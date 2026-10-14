import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MOOD_OPTIONS, NO_MOOD, type MoodValue } from "@/lib/mood"

// Radix reports "" when the pressed item is pressed again, so the explicit
// "None" item needs a value of its own inside the group.
const NONE_ITEM = "none"

type MoodPickerProps = {
  value: MoodValue
  onChange: (value: MoodValue) => void
  disabled?: boolean
  /** Show the mood name next to its emoji instead of the emoji alone. */
  hasLabels?: boolean
  /**
   * Add an explicit "None" choice that cannot be un-pressed. Without it, pressing
   * the selected mood again clears it.
   */
  hasNoneOption?: boolean
  // FormControl hands id and aria-* attributes down to its child.
} & Omit<React.ComponentProps<"div">, "onChange" | "children" | "defaultValue" | "dir">

export function MoodPicker({
  value,
  onChange,
  disabled: isDisabled,
  hasLabels = false,
  hasNoneOption = false,
  ...props
}: MoodPickerProps) {
  const groupValue = hasNoneOption && value === NO_MOOD ? NONE_ITEM : value

  const handleValueChange = (next: string) => {
    if (next === NONE_ITEM) return onChange(NO_MOOD)
    // Pressing the selected item reports "": keep it when "None" is a choice,
    // otherwise it is how the mood is cleared.
    if (next === "" && hasNoneOption) return
    onChange(next as MoodValue)
  }

  return (
    <ToggleGroup
      {...props}
      type="single"
      variant="outline"
      size="sm"
      spacing={2}
      value={groupValue}
      onValueChange={handleValueChange}
      disabled={isDisabled}
    >
      {hasNoneOption ? <ToggleGroupItem value={NONE_ITEM}>None</ToggleGroupItem> : null}
      {MOOD_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={hasLabels ? undefined : option.label}
        >
          <span aria-hidden="true">{option.emoji}</span>
          {hasLabels ? option.label : null}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
