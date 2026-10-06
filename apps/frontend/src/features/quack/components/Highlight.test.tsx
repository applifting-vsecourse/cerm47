import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Highlight } from "@/features/quack/components/Highlight"

describe("Highlight", () => {
  it("marks every term, ignoring case", () => {
    const { container } = render(
      <Highlight
        text="Ducks love a duck pond"
        terms={["duck", "POND"]}
      />,
    )

    expect([...container.querySelectorAll("mark")].map((mark) => mark.textContent)).toEqual([
      "Duck",
      "duck",
      "pond",
    ])
    expect(container.textContent).toBe("Ducks love a duck pond")
  })

  it("treats regex characters in a term literally", () => {
    const { container } = render(
      <Highlight
        text="1+1 is 2"
        terms={["1+1"]}
      />,
    )

    expect(container.querySelector("mark")?.textContent).toBe("1+1")
  })

  it("renders plain text without terms", () => {
    const { container } = render(<Highlight text="hello" />)

    expect(container.querySelector("mark")).toBeNull()
  })
})
