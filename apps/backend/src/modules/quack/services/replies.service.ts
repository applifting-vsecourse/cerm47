import { QuackMood } from '@/modules/quack/domain/quack';
import { Reply } from '@/modules/quack/domain/reply';
import { ReplyRepository } from '@/modules/quack/repositories/reply.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(private readonly replyRepository: ReplyRepository) {}

  async list(quackId: string): Promise<Reply[]> {
    const replies = await this.replyRepository.getReplies(quackId);
    if (!replies) throw new NotFoundException('Quack not found');
    return replies;
  }

  async create(
    user: Identity,
    quackId: string,
    data: { text: string; mood?: QuackMood },
  ): Promise<Reply> {
    const result = await this.replyRepository.createReply({
      quackId,
      // the author is taken from the session, never from the request body
      userId: user.id,
      text: data.text,
      mood: data.mood,
    });
    switch (result.status) {
      case 'no_quack':
        throw new NotFoundException('Quack not found');
      case 'deleted':
        throw new ConflictException('This quack was deleted');
      case 'ok':
        // Ids only: the text of a reply is never logged.
        this.logger.log(
          JSON.stringify({
            event: 'reply_created',
            userId: user.id,
            quackId,
            replyId: result.reply.id,
          }),
        );
        return result.reply;
    }
  }

  async remove(
    user: Identity,
    quackId: string,
    replyId: string,
  ): Promise<void> {
    // identity and role come from the session, never from the request
    const result = await this.replyRepository.deleteReply(
      quackId,
      replyId,
      user.id,
      user.role === 'admin',
    );
    switch (result.status) {
      case 'no_reply':
        throw new NotFoundException('Reply not found');
      case 'not_author':
        throw new ForbiddenException('You can only delete your own replies');
      case 'ok':
        this.logger.log(
          JSON.stringify({ event: 'reply_deleted', userId: user.id, replyId }),
        );
    }
  }
}
