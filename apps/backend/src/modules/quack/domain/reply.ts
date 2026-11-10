import { QuackAuthor, QuackMood } from './quack';

/** An answer to one quack. A reply cannot be answered and holds no poll. */
export type Reply = {
  id: string;
  text: string;
  mood: QuackMood | null;
  createdAt: Date;
  user: QuackAuthor;
};
