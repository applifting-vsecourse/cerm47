import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { PollsController } from './controllers/polls.controller';
import { QuacksController } from './controllers/quacks.controller';
import { RepliesController } from './controllers/replies.controller';
import { PollRepository } from './repositories/poll.repository';
import { QuackRepository } from './repositories/quack.repository';
import { ReplyRepository } from './repositories/reply.repository';
import { PollsService } from './services/polls.service';
import { QuacksService } from './services/quacks.service';
import { RepliesService } from './services/replies.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [QuacksController, PollsController, RepliesController],
  providers: [
    QuacksService,
    QuackRepository,
    PollsService,
    PollRepository,
    RepliesService,
    ReplyRepository,
  ],
  exports: [QuacksService],
})
export class QuackModule {}
