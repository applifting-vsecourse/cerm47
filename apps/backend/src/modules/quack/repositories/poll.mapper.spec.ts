import { mapPrismaPollToDomain } from './poll.mapper';

const prismaPoll = (
  overrides: Partial<Parameters<typeof mapPrismaPollToDomain>[0]> = {},
): Parameters<typeof mapPrismaPollToDomain>[0] => ({
  id: 'p1',
  quackId: 'q1',
  closedAt: null,
  options: [
    {
      id: 'o1',
      pollId: 'p1',
      text: 'Pizza',
      position: 0,
      _count: { votes: 3 },
    },
    {
      id: 'o2',
      pollId: 'p1',
      text: 'Sushi',
      position: 1,
      _count: { votes: 1 },
    },
    { id: 'o3', pollId: 'p1', text: 'Soup', position: 2, _count: { votes: 0 } },
  ],
  votes: [],
  ...overrides,
});

describe('mapPrismaPollToDomain', () => {
  it('keeps the option order and counts', () => {
    expect(mapPrismaPollToDomain(prismaPoll()).options).toEqual([
      { id: 'o1', text: 'Pizza', votes: 3 },
      { id: 'o2', text: 'Sushi', votes: 1 },
      { id: 'o3', text: 'Soup', votes: 0 },
    ]);
  });

  it('totals the votes of all options', () => {
    expect(mapPrismaPollToDomain(prismaPoll()).totalVotes).toBe(4);
  });

  it('is 0 votes in total when nobody voted', () => {
    const poll = prismaPoll({
      options: [
        {
          id: 'o1',
          pollId: 'p1',
          text: 'a',
          position: 0,
          _count: { votes: 0 },
        },
        {
          id: 'o2',
          pollId: 'p1',
          text: 'b',
          position: 1,
          _count: { votes: 0 },
        },
      ],
    });
    expect(mapPrismaPollToDomain(poll).totalVotes).toBe(0);
  });

  it("exposes only the viewer's own pick", () => {
    const poll = prismaPoll({ votes: [{ optionId: 'o2' }] });
    expect(mapPrismaPollToDomain(poll).myOptionId).toBe('o2');
  });

  it('has no pick when the viewer has not voted', () => {
    expect(mapPrismaPollToDomain(prismaPoll()).myOptionId).toBeNull();
  });

  it('is closed once closedAt is set', () => {
    expect(mapPrismaPollToDomain(prismaPoll()).isClosed).toBe(false);
    expect(
      mapPrismaPollToDomain(prismaPoll({ closedAt: new Date() })).isClosed,
    ).toBe(true);
  });
});
