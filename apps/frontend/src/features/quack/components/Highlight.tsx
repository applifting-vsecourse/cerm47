type HighlightProps = {
  text: string
  terms?: string[]
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Wraps every case-insensitive occurrence of any term in <mark>.
export function Highlight({ text, terms = [] }: HighlightProps) {
  if (terms.length === 0) return <>{text}</>

  // Longest first, so "duck" wins over "du" when both are searched.
  const pattern = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")
  // The capture group makes split() keep the matches, at the odd indexes.
  const parts = text.split(new RegExp(`(${pattern})`, "i"))

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="rounded-sm bg-secondary text-foreground"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
