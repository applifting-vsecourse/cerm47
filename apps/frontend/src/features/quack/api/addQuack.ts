import { api } from "@/lib/api-client"

import { quackSchema, type Quack, type QuackMood } from "@/features/quack/api/quackSchemas"

export async function addQuack(input: {
  text: string
  mood?: QuackMood
  /** Answers to choose from; makes the quack a poll. */
  pollOptions?: string[]
}): Promise<Quack> {
  const { pollOptions, ...quack } = input
  const json = await api
    .post("quacks", {
      json: { ...quack, poll: pollOptions ? { options: pollOptions } : undefined },
    })
    .json()
  return quackSchema.parse(json)
}
