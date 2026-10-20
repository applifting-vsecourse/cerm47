import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class QuacksService {
  private readonly logger = new Logger(QuacksService.name);

  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    user: Identity,
    search?: string,
    mine?: boolean,
  ): Promise<Quack[]> {
    const terms = (search ?? '').split(/\s+/).filter(Boolean);
    const quacks = await this.quackRepository.getQuacks(
      user.id,
      terms,
      mine === true ? user.id : undefined,
    );

    // One line per search request, so usage of the feature can be counted.
    // Blank terms are plain feed loads and are not logged.
    if (terms.length > 0) {
      this.logger.log(
        JSON.stringify({
          event: 'quack_search',
          userId: user.id,
          term: terms.join(' '),
          results: quacks.length,
        }),
      );
    }
    return quacks;
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: QuackMood; pollOptions?: string[] },
  ): Promise<Quack> {
    const quack = await this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      pollOptions: quackData.pollOptions,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });

    // Only ids and a count: neither the question nor the options are logged.
    if (quack.poll) {
      this.logger.log(
        JSON.stringify({
          event: 'poll_created',
          userId: user.id,
          pollId: quack.poll.id,
          options: quack.poll.options.length,
        }),
      );
    }
    return quack;
  }

  async deleteQuack(user: Identity, id: string): Promise<void> {
    const quack = await this.quackRepository.getQuackById(id);
    if (!quack) throw new NotFoundException('Quack not found');
    // ownership comes from the session, never from the request
    if (quack.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own quacks');
    }
    await this.quackRepository.deleteQuack(id);
  }
}
