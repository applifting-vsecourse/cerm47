import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteReply } from "@/features/quack/api/deleteReply"
import { quackKeys } from "@/features/quack/api/quackKeys"
import { useDeleteReply } from "@/features/quack/hooks/useDeleteReply"

vi.mock("@/features/quack/api/deleteReply", () => ({ deleteReply: vi.fn() }))

describe("useDeleteReply", () => {
  beforeEach(() => {
    vi.mocked(deleteReply).mockReset()
  })

  it("invalidates every quack query after a reply is deleted", async () => {
    vi.mocked(deleteReply).mockResolvedValue()
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteReply("q1"), { wrapper })
    result.current.mutate("r1")

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
    expect(deleteReply).toHaveBeenCalledWith({ quackId: "q1", replyId: "r1" })
  })
})
