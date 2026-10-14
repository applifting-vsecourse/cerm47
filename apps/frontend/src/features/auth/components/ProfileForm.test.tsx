import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { ProfileForm } from "@/features/auth/components/ProfileForm"

const updateUser = vi.hoisted(() => vi.fn())
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { updateUser } }))

const user: SessionUser = {
  id: "u1",
  email: "duck@example.com",
  name: "Caffeinated Duck",
  username: "duck",
  bio: "Quack.",
  defaultMood: "happy",
}

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), { user })
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileForm user={user} />
    </QueryClientProvider>,
  )
  return queryClient
}

describe("ProfileForm", () => {
  beforeEach(() => updateUser.mockReset())

  it("starts with the saved profile", () => {
    renderForm()

    expect(screen.getByLabelText("Username")).toHaveValue("duck")
    expect(screen.getByLabelText("Display name")).toHaveValue("Caffeinated Duck")
    expect(screen.getByLabelText("Bio (optional)")).toHaveValue("Quack.")
    expect(screen.getByRole("radio", { name: /Happy/ })).toBeChecked()
  })

  it.each([
    ["ab", "Username must be at least 3 characters"],
    ["a".repeat(31), "Username can be at most 30 characters"],
    ["no spaces", "Use only letters, numbers, dots and underscores"],
  ])("rejects the username %j before calling the server", async (typed, message) => {
    renderForm()

    const field = screen.getByLabelText("Username")
    await userEvent.clear(field)
    await userEvent.type(field, typed)
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("requires a display name", async () => {
    renderForm()

    await userEvent.clear(screen.getByLabelText("Display name"))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Display name is required")).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("rejects a bio over 160 characters", async () => {
    renderForm()

    const bio = screen.getByLabelText("Bio (optional)")
    await userEvent.clear(bio)
    await userEvent.click(bio)
    await userEvent.paste("a".repeat(161))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Keep your bio under 160 characters")).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("says so next to the username when it is taken, and keeps what was typed", async () => {
    updateUser.mockResolvedValue({
      error: { code: "USERNAME_IS_ALREADY_TAKEN", message: "Username is already taken." },
    })
    renderForm()

    const field = screen.getByLabelText("Username")
    await userEvent.clear(field)
    await userEvent.type(field, "taken_name")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Username is already taken.")).toBeInTheDocument()
    expect(field).toHaveValue("taken_name")
    expect(field).toHaveAttribute("aria-invalid", "true")
    // Only what changed is sent.
    expect(updateUser).toHaveBeenCalledExactlyOnceWith({ username: "taken_name" })
  })

  it("confirms a save and shows what the server stored", async () => {
    updateUser.mockImplementation(() => {
      // The server lower-cases usernames; the refreshed session carries that.
      queryClient.setQueryData(authKeys.session(), { user: { ...user, username: "new.name" } })
      return Promise.resolve({ error: null })
    })
    const queryClient = renderForm()

    const field = screen.getByLabelText("Username")
    await userEvent.clear(field)
    await userEvent.type(field, "New.Name")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByRole("status")).toHaveTextContent("Your settings are saved.")
    expect(field).toHaveValue("new.name")
  })

  it("sends null when the default mood is set to none", async () => {
    updateUser.mockResolvedValue({ error: null })
    renderForm()

    await userEvent.click(screen.getByRole("radio", { name: "None" }))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByRole("status")).toBeInTheDocument()
    expect(updateUser).toHaveBeenCalledExactlyOnceWith({ defaultMood: null })
  })

  it("discards changes and any error, back to what is saved", async () => {
    updateUser.mockResolvedValue({
      error: { code: "USERNAME_IS_ALREADY_TAKEN", message: "Username is already taken." },
    })
    renderForm()

    const field = screen.getByLabelText("Username")
    await userEvent.clear(field)
    await userEvent.type(field, "taken_name")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
    await screen.findByText("Username is already taken.")

    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(field).toHaveValue("duck")
    expect(screen.queryByText("Username is already taken.")).not.toBeInTheDocument()
  })
})
