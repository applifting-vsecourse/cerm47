import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QuacksService {
  private readonly logger = new Logger(QuacksService.name);

  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(user: Identity, search?: string): Promise<Quack[]> {
    const terms = (search ?? '').split(/\s+/).filter(Boolean);
    const quacks = await this.quackRepository.getQuacks(terms);

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
    quackData: { text: string; mood?: QuackMood },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
