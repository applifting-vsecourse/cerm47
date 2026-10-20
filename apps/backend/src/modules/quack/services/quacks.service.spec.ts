// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Poll } from '@/modules/quack/domain/poll';
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  ...overrides,
});

describe('QuacksService', () => {
  const user = { id: 'u1' } as Identity;

  it('returns the full feed without a search term', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);
    const log = jest.spyOn(service['logger'], 'log').mockImplementation();

    await expect(service.getQuacks(user)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', [], undefined);
    expect(log).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only term as no search', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);
    const log = jest.spyOn(service['logger'], 'log').mockImplementation();

    await service.getQuacks(user, '   ');
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', [], undefined);
    expect(log).not.toHaveBeenCalled();
  });

  it('splits the term into words and logs the search', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([aQuack()]);

    const service = new QuacksService(repository);
    const log = jest.spyOn(service['logger'], 'log').mockImplementation();

    await service.getQuacks(user, '  duck   pond ');
    expect(repository.getQuacks).toHaveBeenCalledWith(
      'u1',
      ['duck', 'pond'],
      undefined,
    );
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
      event: 'quack_search',
      userId: 'u1',
      term: 'duck pond',
      results: 1,
    });
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: undefined,
      userId: 'u1',
    });
  });

  it('creates a quack with a mood', async () => {
    const created = aQuack({ id: 'q3', text: 'hello', mood: 'happy' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'hello', mood: 'happy' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: 'happy',
      userId: 'u1',
    });
  });

  describe('polls', () => {
    const aPoll = (): Poll => ({
      id: 'p1',
      isClosed: false,
      totalVotes: 0,
      myOptionId: null,
      options: [
        { id: 'o1', text: 'Pizza', votes: 0 },
        { id: 'o2', text: 'Sushi', votes: 0 },
      ],
    });

    it('creates a quack with a poll and logs it without any text', async () => {
      const created = aQuack({ id: 'q4', poll: aPoll() });
      const repository = mock<QuackRepository>();
      repository.createQuack.mockResolvedValue(created);

      const service = new QuacksService(repository);
      const log = jest.spyOn(service['logger'], 'log').mockImplementation();

      await expect(
        service.createQuack(user, {
          text: 'Lunch?',
          pollOptions: ['Pizza', 'Sushi'],
        }),
      ).resolves.toEqual(created);
      expect(repository.createQuack).toHaveBeenCalledWith({
        text: 'Lunch?',
        mood: undefined,
        pollOptions: ['Pizza', 'Sushi'],
        userId: 'u1',
      });
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
        event: 'poll_created',
        userId: 'u1',
        pollId: 'p1',
        options: 2,
      });
    });

    it('does not log a poll for a plain quack', async () => {
      const repository = mock<QuackRepository>();
      repository.createQuack.mockResolvedValue(aQuack());

      const service = new QuacksService(repository);
      const log = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.createQuack(user, { text: 'hello' });
      expect(log).not.toHaveBeenCalled();
    });
  });

  it('limits the feed to the signed-in user when mine is set', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);
    await service.getQuacks(user, undefined, true);
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', [], 'u1');
  });

  it("deletes the signed-in user's own quack", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuackById.mockResolvedValue(aQuack());

    const service = new QuacksService(repository);
    await service.deleteQuack(user, 'q1');
    expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
  });

  it("refuses to delete someone else's quack", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuackById.mockResolvedValue(aQuack({ userId: 'u2' }));

    const service = new QuacksService(repository);
    await expect(service.deleteQuack(user, 'q1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });

  it('reports a missing quack as not found', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuackById.mockResolvedValue(null);

    const service = new QuacksService(repository);
    await expect(service.deleteQuack(user, 'nope')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });
});
