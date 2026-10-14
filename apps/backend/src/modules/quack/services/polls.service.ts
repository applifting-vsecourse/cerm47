import { Poll } from '@/modules/quack/domain/poll';
import { PollRepository } from '@/modules/quack/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  constructor(private readonly pollRepository: PollRepository) {}

  async vote(user: Identity, quackId: string, optionId: string): Promise<Poll> {
    const result = await this.pollRepository.castVote(
      quackId,
      user.id,
      optionId,
    );
    switch (result.status) {
      case 'no_poll':
        throw new NotFoundException('This quack has no poll');
      case 'bad_option':
        throw new BadRequestException('That option is not part of this poll');
      case 'closed':
        throw new ConflictException('This poll is closed');
      case 'ok':
        // Repeating a vote changes nothing, so it is not counted as one.
        if (result.kind !== 'unchanged') {
          this.log('poll_vote', user, result.poll, { kind: result.kind });
        }
        return result.poll;
    }
  }

  async close(user: Identity, quackId: string): Promise<Poll> {
    const result = await this.pollRepository.closePoll(quackId, user.id);
    switch (result.status) {
      case 'no_poll':
        throw new NotFoundException('This quack has no poll');
      case 'not_author':
        throw new ForbiddenException('Only the author can close a poll');
      case 'ok':
        if (result.didClose) this.log('poll_closed', user, result.poll);
        return result.poll;
    }
  }

  // Ids only: neither the question nor the options are logged.
  private log(
    event: string,
    user: Identity,
    poll: Poll,
    extra: Record<string, string> = {},
  ): void {
    this.logger.log(
      JSON.stringify({ event, userId: user.id, pollId: poll.id, ...extra }),
    );
  }
}
