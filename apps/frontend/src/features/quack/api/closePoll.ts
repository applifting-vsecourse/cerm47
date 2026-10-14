import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

export async function closePoll(input: { quackId: string }): Promise<Poll> {
  const json = await api.post(`quacks/${input.quackId}/poll/close`).json()
  return pollSchema.parse(json)
}
