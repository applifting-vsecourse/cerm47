import { Poll } from '@/modules/quack/domain/poll';
import { Quack } from '@/modules/quack/domain/quack';
import { QuackResponseDto } from './quack.response.dto';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'Lunch?',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  ...overrides,
});

describe('QuackResponseDto', () => {
  it('has no poll for a plain quack', () => {
    expect(QuackResponseDto.fromDomain(aQuack()).poll).toBeNull();
    expect(QuackResponseDto.fromDomain(aQuack({ poll: null })).poll).toBeNull();
  });

  it('carries the poll with counts and the viewer pick', () => {
    const poll: Poll = {
      id: 'p1',
      isClosed: true,
      totalVotes: 3,
      myOptionId: 'o2',
      options: [
        { id: 'o1', text: 'Pizza', votes: 1 },
        { id: 'o2', text: 'Sushi', votes: 2 },
      ],
    };
    expect(QuackResponseDto.fromDomain(aQuack({ poll })).poll).toEqual(poll);
  });
});
