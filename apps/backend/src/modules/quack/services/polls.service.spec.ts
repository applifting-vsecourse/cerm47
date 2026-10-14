import { Poll } from '@/modules/quack/domain/poll';
import { PollRepository } from '@/modules/quack/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { PollsService } from './polls.service';

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  isClosed: false,
  totalVotes: 1,
  myOptionId: 'o1',
  options: [
    { id: 'o1', text: 'Pizza', votes: 1 },
    { id: 'o2', text: 'Sushi', votes: 0 },
  ],
  ...overrides,
});

describe('PollsService', () => {
  const user = { id: 'u1' } as Identity;

  const setup = (): {
    repository: ReturnType<typeof mock<PollRepository>>;
    service: PollsService;
    log: jest.SpyInstance;
  } => {
    const repository = mock<PollRepository>();
    const service = new PollsService(repository);
    const log = jest.spyOn(service['logger'], 'log').mockImplementation();
    return { repository, service, log };
  };
  const loggedEvents = (log: jest.SpyInstance): unknown[] =>
    log.mock.calls.map((call) => JSON.parse(call[0] as string) as unknown);

  describe('vote', () => {
    it('returns the poll and logs a first vote', async () => {
      const { repository, service, log } = setup();
      const poll = aPoll();
      repository.castVote.mockResolvedValue({
        status: 'ok',
        kind: 'first',
        poll,
      });

      await expect(service.vote(user, 'q1', 'o1')).resolves.toEqual(poll);
      expect(repository.castVote).toHaveBeenCalledWith('q1', 'u1', 'o1');
      expect(loggedEvents(log)).toEqual([
        { event: 'poll_vote', userId: 'u1', pollId: 'p1', kind: 'first' },
      ]);
    });

    it('logs a changed vote', async () => {
      const { repository, service, log } = setup();
      repository.castVote.mockResolvedValue({
        status: 'ok',
        kind: 'changed',
        poll: aPoll(),
      });

      await service.vote(user, 'q1', 'o2');
      expect(loggedEvents(log)).toEqual([
        { event: 'poll_vote', userId: 'u1', pollId: 'p1', kind: 'changed' },
      ]);
    });

    it('returns the poll without logging when the vote is repeated', async () => {
      const { repository, service, log } = setup();
      const poll = aPoll();
      repository.castVote.mockResolvedValue({
        status: 'ok',
        kind: 'unchanged',
        poll,
      });

      await expect(service.vote(user, 'q1', 'o1')).resolves.toEqual(poll);
      expect(log).not.toHaveBeenCalled();
    });

    it.each([
      ['no_poll', NotFoundException],
      ['bad_option', BadRequestException],
      ['closed', ConflictException],
    ] as const)(
      'maps %s to an HTTP error and logs nothing',
      async (status, error) => {
        const { repository, service, log } = setup();
        repository.castVote.mockResolvedValue({ status });

        await expect(service.vote(user, 'q1', 'o1')).rejects.toBeInstanceOf(
          error,
        );
        expect(log).not.toHaveBeenCalled();
      },
    );
  });

  describe('close', () => {
    it('lets the author close and logs it', async () => {
      const { repository, service, log } = setup();
      const poll = aPoll({ isClosed: true });
      repository.closePoll.mockResolvedValue({
        status: 'ok',
        didClose: true,
        poll,
      });

      await expect(service.close(user, 'q1')).resolves.toEqual(poll);
      expect(repository.closePoll).toHaveBeenCalledWith('q1', 'u1');
      expect(loggedEvents(log)).toEqual([
        { event: 'poll_closed', userId: 'u1', pollId: 'p1' },
      ]);
    });

    it('succeeds without a second log line when already closed', async () => {
      const { repository, service, log } = setup();
      const poll = aPoll({ isClosed: true });
      repository.closePoll.mockResolvedValue({
        status: 'ok',
        didClose: false,
        poll,
      });

      await expect(service.close(user, 'q1')).resolves.toEqual(poll);
      expect(log).not.toHaveBeenCalled();
    });

    it.each([
      ['no_poll', NotFoundException],
      ['not_author', ForbiddenException],
    ] as const)(
      'maps %s to an HTTP error and logs nothing',
      async (status, error) => {
        const { repository, service, log } = setup();
        repository.closePoll.mockResolvedValue({ status });

        await expect(service.close(user, 'q1')).rejects.toBeInstanceOf(error);
        expect(log).not.toHaveBeenCalled();
      },
    );
  });
});
