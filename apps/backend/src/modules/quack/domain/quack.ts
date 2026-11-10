import { QuackMood } from '@/generated/prisma/client';
import { Poll } from './poll';

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

/** The longest text a quack or a reply may have. */
export const QUACK_TEXT_MAX_LENGTH = 280;

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  /** Null only on a tombstone: a deleted quack that still has replies. */
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  /** Counted on every read, never stored. */
  replyCount: number;
  user?: QuackAuthor;
  poll?: Poll | null;
};

export { QuackMood };
