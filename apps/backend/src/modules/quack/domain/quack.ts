import { QuackMood } from '@/generated/prisma/client';
import { Poll } from './poll';

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  poll?: Poll | null;
};

export { QuackMood };
