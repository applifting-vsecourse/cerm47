import { expect, test, type Browser, type Page } from "@playwright/test"

import { signIn } from "./signIn"

const API = "http://localhost:4050/api"

async function findQuackNotBy(page: Page, username: string): Promise<{ id: string }> {
  const quacks: { id: string; user: { username: string } }[] = await (
    await page.request.get(`${API}/quacks`)
  ).json()
  return quacks.find((quack) => quack.user.username !== username)!
}

type FeedQuack = { id: string; text: string; isDeleted: boolean; replyCount: number }

async function postQuackViaApi(page: Page, text: string): Promise<string> {
  const response = await page.request.post(`${API}/quacks`, { data: { text } })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

async function replyViaApi(page: Page, quackId: string, text: string): Promise<string> {
  const response = await page.request.post(`${API}/quacks/${quackId}/replies`, { data: { text } })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

async function feedViaApi(page: Page): Promise<FeedQuack[]> {
  return (await (await page.request.get(`${API}/quacks`)).json()) as FeedQuack[]
}

async function signInAs(browser: Browser, email: string, password: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  await signIn(page, email, password)
  return page
}

test("author can post a quack and delete it", async ({ page }) => {
  const text = `E2E quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")

  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = page.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()

  await quack.getByRole("button", { name: "Delete quack" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  // An open modal hides the feed from role queries, so wait for it to close first.
  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(quack).toHaveCount(0)
})

test("nobody can delete someone else's quack", async ({ page }) => {
  await signIn(page, "deepduckthoughts@example.com", "password2")
  await page.goto("/quacks")

  const othersQuack = page.getByRole("article").filter({ hasNotText: "@DeepDuckThoughts" }).first()
  await expect(othersQuack.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

  // The button is hidden. Now skip the UI and ask the server directly.
  const notMine = await findQuackNotBy(page, "DeepDuckThoughts")
  const response = await page.request.delete(`${API}/quacks/${notMine.id}`)
  expect(response.status()).toBe(403)
})

test("moderator can delete someone else's quack", async ({ page, browser }) => {
  // A throwaway quack by a regular user, so seed data stays untouched.
  const text = `E2E mod quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")
  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  await expect(page.getByRole("article").filter({ hasText: text })).toBeVisible()

  const moderator = await (await browser.newContext()).newPage()
  await signIn(moderator, "admin@example.com", "adminpassword")
  await moderator.goto("/quacks")

  const quack = moderator.getByRole("article").filter({ hasText: text })
  await quack.getByRole("button", { name: "Delete quack" }).click()
  await moderator.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(moderator.getByRole("dialog")).toBeHidden()
  await expect(quack).toHaveCount(0)
})

test("a reply shows up under its quack", async ({ page }) => {
  const text = `E2E reply quack ${Date.now()}`
  const replyText = `E2E reply ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")
  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = page.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()

  await quack.getByRole("button", { name: "Reply", exact: true }).click()
  await quack.getByLabel("Your reply").fill(replyText)
  await quack.getByRole("button", { name: "Post reply" }).click()

  await expect(quack.getByRole("listitem").filter({ hasText: replyText })).toBeVisible()
  await expect(quack.getByRole("button", { name: "1 reply" })).toBeVisible()

  // Leave nothing behind: the reply first, then the quack, which then goes completely.
  const { id } = (await feedViaApi(page)).find((item) => item.text === text)!
  const replies = (await (await page.request.get(`${API}/quacks/${id}/replies`)).json()) as {
    id: string
  }[]
  for (const reply of replies) {
    expect((await page.request.delete(`${API}/quacks/${id}/replies/${reply.id}`)).status()).toBe(
      204,
    )
  }
  expect((await page.request.delete(`${API}/quacks/${id}`)).status()).toBe(204)
})

test("deleting a quack with replies leaves a tombstone, keeps the replies, and its text appears nowhere", async ({
  page,
  browser,
}) => {
  const text = `E2E secret quack ${Date.now()}`
  const replyText = `E2E surviving reply ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  const quackId = await postQuackViaApi(page, text)
  const other = await signInAs(browser, "deepduckthoughts@example.com", "password2")
  const replyId = await replyViaApi(other, quackId, replyText)

  await page.goto("/quacks")
  const quack = page.getByRole("article").filter({ hasText: text })
  await quack.getByRole("button", { name: "Delete quack" }).click()
  await expect(page.getByRole("dialog")).toContainText("Replies to it stay.")
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click()
  // An open modal hides the feed from role queries, so wait for it to close first.
  await expect(page.getByRole("dialog")).toBeHidden()

  // Gone from the screen, with a placeholder in its place and the reply still under it.
  await expect(page.getByText(text)).toHaveCount(0)
  const tombstone = page
    .getByRole("article")
    .filter({ hasText: "This quack was deleted" })
    .filter({ has: page.getByRole("button", { name: "1 reply" }) })
  await tombstone.getByRole("button", { name: "1 reply" }).click()
  await expect(tombstone.getByText(replyText)).toBeVisible()
  await expect(tombstone.getByLabel("Your reply")).toHaveCount(0)
  await expect(tombstone.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

  // Gone from the feed, the search and the replies, as the API answers them.
  expect(JSON.stringify(await feedViaApi(page))).not.toContain(text)
  const search = await page.request.get(`${API}/quacks`, { params: { q: text } })
  expect(await search.json()).toEqual([])
  const replies = await (await page.request.get(`${API}/quacks/${quackId}/replies`)).text()
  expect(replies).not.toContain(text)
  expect(replies).toContain(replyText)

  // Leave nothing behind: the last reply takes the tombstone with it.
  expect((await other.request.delete(`${API}/quacks/${quackId}/replies/${replyId}`)).status()).toBe(
    204,
  )
})

test("deleting the last reply removes the tombstone", async ({ page, browser }) => {
  const text = `E2E fading quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  const quackId = await postQuackViaApi(page, text)
  const other = await signInAs(browser, "deepduckthoughts@example.com", "password2")
  await replyViaApi(other, quackId, `E2E last reply ${Date.now()}`)
  expect((await page.request.delete(`${API}/quacks/${quackId}`)).status()).toBe(204)
  expect((await feedViaApi(page)).find((item) => item.id === quackId)?.isDeleted).toBe(true)

  await other.goto("/quacks")
  const tombstone = other
    .getByRole("article")
    .filter({ hasText: "This quack was deleted" })
    .filter({ has: other.getByRole("button", { name: "1 reply" }) })
  await tombstone.getByRole("button", { name: "1 reply" }).click()
  await tombstone.getByRole("button", { name: "Delete reply" }).click()
  await expect(other.getByRole("dialog")).toContainText("Delete this reply?")
  await other.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click()
  await expect(other.getByRole("dialog")).toBeHidden()

  await expect(tombstone).toHaveCount(0)
  expect((await feedViaApi(page)).find((item) => item.id === quackId)).toBeUndefined()
})

test("nobody can reply to a tombstone, and nobody can delete it again", async ({
  page,
  browser,
}) => {
  const text = `E2E frozen quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  const quackId = await postQuackViaApi(page, text)
  const other = await signInAs(browser, "deepduckthoughts@example.com", "password2")
  const replyId = await replyViaApi(other, quackId, `E2E frozen reply ${Date.now()}`)
  expect((await page.request.delete(`${API}/quacks/${quackId}`)).status()).toBe(204)

  const late = await other.request.post(`${API}/quacks/${quackId}/replies`, {
    data: { text: "Too late" },
  })
  expect(late.status()).toBe(409)
  // The replies are still readable, and the tombstone cannot be deleted again, even by an admin.
  expect((await other.request.get(`${API}/quacks/${quackId}/replies`)).status()).toBe(200)
  expect((await page.request.delete(`${API}/quacks/${quackId}`)).status()).toBe(404)
  const moderator = await signInAs(browser, "admin@example.com", "adminpassword")
  expect((await moderator.request.delete(`${API}/quacks/${quackId}`)).status()).toBe(404)

  expect((await other.request.delete(`${API}/quacks/${quackId}/replies/${replyId}`)).status()).toBe(
    204,
  )
})
