import { PollsService } from '@/modules/quack/services/polls.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CastVoteDto } from './dto/cast-vote.dto';
import { PollResponseDto } from './dto/quack.response.dto';

@ApiTags('quacks')
@Controller('quacks/:quackId/poll')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Put('vote')
  @ApiOperation({
    summary: 'Set your vote on a poll',
    description:
      'One vote per person: this replaces your earlier vote. Sending the same request again changes nothing.',
  })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({
    status: 400,
    description: 'The option is not part of this poll',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'The quack has no poll' })
  @ApiResponse({ status: 409, description: 'The poll is closed' })
  async vote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: CastVoteDto,
  ): Promise<PollResponseDto> {
    const poll = await this.pollsService.vote(user, quackId, body.optionId);
    return PollResponseDto.fromDomain(poll);
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a poll for good (author only)',
    description: 'Closing an already closed poll succeeds and changes nothing.',
  })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Only the author can close a poll' })
  @ApiResponse({ status: 404, description: 'The quack has no poll' })
  async close(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<PollResponseDto> {
    const poll = await this.pollsService.close(user, quackId);
    return PollResponseDto.fromDomain(poll);
  }
}
