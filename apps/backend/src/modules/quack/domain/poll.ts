export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

/** A poll as one viewer sees it: counts for everyone, the pick only for them. */
export type Poll = {
  id: string;
  isClosed: boolean;
  totalVotes: number;
  myOptionId: string | null;
  options: PollOption[];
};
