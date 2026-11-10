export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search?: string, isMine?: boolean) => [...quackKeys.lists(), { search, isMine }] as const,
  // Under all(), so every invalidation of the feed also refreshes the replies.
  replies: (quackId: string) => [...quackKeys.all(), "replies", quackId] as const,
}
