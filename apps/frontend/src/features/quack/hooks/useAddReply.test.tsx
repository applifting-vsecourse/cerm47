import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addReply } from "@/features/quack/api/addReply"
import { quackKeys } from "@/features/quack/api/quackKeys"
import { useAddReply } from "@/features/quack/hooks/useAddReply"

vi.mock("@/features/quack/api/addReply", () => ({ addReply: vi.fn() }))

describe("useAddReply", () => {
  beforeEach(() => {
    vi.mocked(addReply).mockReset()
  })

  it("invalidates every quack query after a reply is posted", async () => {
    vi.mocked(addReply).mockResolvedValue({
      id: "r1",
      text: "Agreed",
      mood: null,
      createdAt: new Date(),
      user: { id: "u2", name: "Goose", username: "goose" },
    })
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useAddReply("q1"), { wrapper })
    result.current.mutate({ text: "Agreed" })

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
    expect(addReply).toHaveBeenCalledWith({ quackId: "q1", text: "Agreed" })
  })

  it("keeps replies under the same key prefix as the feed", () => {
    expect(quackKeys.replies("q1").slice(0, 1)).toEqual(quackKeys.all())
  })
})
