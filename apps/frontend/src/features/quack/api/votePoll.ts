import { api, HTTPError } from "@/lib/api-client"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

export async function votePoll(input: { quackId: string; optionId: string }): Promise<Poll> {
  try {
    const json = await api
      .put(`quacks/${input.quackId}/poll/vote`, { json: { optionId: input.optionId } })
      .json()
    return pollSchema.parse(json)
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) throw new PollClosedError()
    throw error
  }
}
