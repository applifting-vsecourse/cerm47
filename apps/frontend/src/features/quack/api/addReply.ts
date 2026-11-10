import { api, HTTPError } from "@/lib/api-client"

import { replySchema, type QuackMood, type Reply } from "@/features/quack/api/quackSchemas"
import { QuackDeletedError } from "@/features/quack/api/replyErrors"

export async function addReply(input: {
  quackId: string
  text: string
  mood?: QuackMood
}): Promise<Reply> {
  try {
    const json = await api
      .post(`quacks/${encodeURIComponent(input.quackId)}/replies`, {
        json: { text: input.text, mood: input.mood },
      })
      .json()
    return replySchema.parse(json)
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) throw new QuackDeletedError()
    throw error
  }
}
