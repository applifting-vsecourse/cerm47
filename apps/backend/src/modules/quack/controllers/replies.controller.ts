import { RepliesService } from '@/modules/quack/services/replies.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReplyResponseDto } from './dto/reply.response.dto';

@ApiTags('quacks')
@Controller('quacks/:quackId/replies')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Get()
  @ApiOperation({
    summary: 'List the replies of a quack, oldest first',
    description: 'Also answers for a deleted quack that still has replies.',
  })
  @ApiResponse({ status: 200, type: [ReplyResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such quack' })
  async list(@Param('quackId') quackId: string): Promise<ReplyResponseDto[]> {
    const replies = await this.repliesService.list(quackId);
    return replies.map(ReplyResponseDto.fromDomain);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a quack' })
  @ApiResponse({ status: 201, type: ReplyResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid reply, or a field a reply does not have (a poll)',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such quack' })
  @ApiResponse({ status: 409, description: 'The quack was deleted' })
  async create(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: CreateReplyDto,
  ): Promise<ReplyResponseDto> {
    const reply = await this.repliesService.create(user, quackId, {
      text: body.text,
      mood: body.mood,
    });
    return ReplyResponseDto.fromDomain(reply);
  }

  @Delete(':replyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reply (its writer, or an admin)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'The reply is someone else’s and you are not an admin',
  })
  @ApiResponse({ status: 404, description: 'No such reply under that quack' })
  async remove(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Param('replyId') replyId: string,
  ): Promise<void> {
    await this.repliesService.remove(user, quackId, replyId);
  }
}
