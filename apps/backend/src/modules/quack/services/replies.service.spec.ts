import { Reply } from '@/modules/quack/domain/reply';
import { ReplyRepository } from '@/modules/quack/repositories/reply.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { RepliesService } from './replies.service';

const aReply = (overrides: Partial<Reply> = {}): Reply => ({
  id: 'r1',
  text: 'Agreed, private words',
  mood: null,
  createdAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  ...overrides,
});

const setup = (): {
  repository: MockProxy<ReplyRepository>;
  service: RepliesService;
  log: jest.SpyInstance;
} => {
  const repository = mock<ReplyRepository>();
  const service = new RepliesService(repository);
  const log = jest.spyOn(service['logger'], 'log').mockImplementation();
  return { repository, service, log };
};

describe('RepliesService', () => {
  const user = { id: 'u1', role: 'user' } as Identity;
  const admin = { id: 'u3', role: 'admin' } as Identity;

  describe('list', () => {
    it('returns the replies of a quack', async () => {
      const { repository, service } = setup();
      repository.getReplies.mockResolvedValue([aReply()]);

      await expect(service.list('q1')).resolves.toEqual([aReply()]);
      expect(repository.getReplies).toHaveBeenCalledWith('q1');
    });

    it('answers 404 when the quack does not exist', async () => {
      const { repository, service } = setup();
      repository.getReplies.mockResolvedValue(null);

      await expect(service.list('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('takes the author from the session and returns the reply', async () => {
      const { repository, service } = setup();
      repository.createReply.mockResolvedValue({
        status: 'ok',
        reply: aReply(),
      });

      await expect(
        service.create(user, 'q1', { text: 'Agreed', mood: 'happy' }),
      ).resolves.toEqual(aReply());
      expect(repository.createReply).toHaveBeenCalledWith({
        quackId: 'q1',
        userId: 'u1',
        text: 'Agreed',
        mood: 'happy',
      });
    });

    it('answers 404 when the quack does not exist', async () => {
      const { repository, service } = setup();
      repository.createReply.mockResolvedValue({ status: 'no_quack' });

      await expect(
        service.create(user, 'nope', { text: 'Agreed' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('answers 409 for a tombstone', async () => {
      const { repository, service } = setup();
      repository.createReply.mockResolvedValue({ status: 'deleted' });

      const attempt = service.create(user, 'q1', { text: 'Agreed' });
      await expect(attempt).rejects.toThrow(ConflictException);
      await expect(attempt).rejects.toThrow('This quack was deleted');
    });

    it('logs reply_created with ids only, never the text', async () => {
      const { repository, service, log } = setup();
      repository.createReply.mockResolvedValue({
        status: 'ok',
        reply: aReply(),
      });

      await service.create(user, 'q1', { text: 'Agreed, private words' });

      expect(log).toHaveBeenCalledTimes(1);
      const line = String(log.mock.calls[0]?.[0]);
      expect(JSON.parse(line)).toEqual({
        event: 'reply_created',
        userId: 'u1',
        quackId: 'q1',
        replyId: 'r1',
      });
      expect(line).not.toContain('private words');
    });
  });

  describe('remove', () => {
    it('answers 404 when the reply does not exist under that quack', async () => {
      const { repository, service } = setup();
      repository.deleteReply.mockResolvedValue({ status: 'no_reply' });

      await expect(service.remove(user, 'q1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("answers 403 for someone else's reply", async () => {
      const { repository, service } = setup();
      repository.deleteReply.mockResolvedValue({ status: 'not_author' });

      await expect(service.remove(user, 'q1', 'r1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets the repository know whether the caller is an admin', async () => {
      const { repository, service } = setup();
      repository.deleteReply.mockResolvedValue({
        status: 'ok',
        didPurgeQuack: false,
      });

      await service.remove(user, 'q1', 'r1');
      await service.remove(admin, 'q1', 'r1');

      expect(repository.deleteReply).toHaveBeenNthCalledWith(
        1,
        'q1',
        'r1',
        'u1',
        false,
      );
      expect(repository.deleteReply).toHaveBeenNthCalledWith(
        2,
        'q1',
        'r1',
        'u3',
        true,
      );
    });

    it('logs reply_deleted with the acting user and the reply id', async () => {
      const { repository, service, log } = setup();
      repository.deleteReply.mockResolvedValue({
        status: 'ok',
        didPurgeQuack: false,
      });

      await service.remove(admin, 'q1', 'r1');

      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
        event: 'reply_deleted',
        userId: 'u3',
        replyId: 'r1',
      });
    });
  });
});
