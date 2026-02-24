import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
} from '@site-haus/validation/forms/comment';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { CommentsService } from './comments.service';

type Req_ = AuthedRequest & { client?: { id: string } };

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @RequirePerms('comments:read')
  @Get()
  async list(@Req() req: Req_, @Query() query: unknown) {
    const parsed = listCommentsQuerySchema.parse(query);

    // Verify caller has access to the target entity
    const targetClientId = await this.comments.resolveTargetClientId(
      parsed.targetType,
      parsed.targetId,
    );
    if (!targetClientId || targetClientId !== req.client!.id) {
      throw new ForbiddenException('Target not found or access denied');
    }

    // TODO: determine isEmployee from req context (e.g. checking role/permissions)
    // For now, check if user has 'comments:manage' as a proxy for employee status
    const isEmployee = (req.user as { permissions?: string[] } | undefined)?.permissions?.includes('comments:manage') ?? false;

    return this.comments.list(parsed, req.client!.id, isEmployee);
  }

  @RequirePerms('comments:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Req_, @Body() body: unknown) {
    const parsed = createCommentSchema.parse(body);

    // Verify caller has access to the target entity
    const targetClientId = await this.comments.resolveTargetClientId(
      parsed.targetType,
      parsed.targetId,
    );
    if (!targetClientId || targetClientId !== req.client!.id) {
      throw new ForbiddenException('Target not found or access denied');
    }

    const result = await this.comments.create(parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });

    if ('error' in result) throw new BadRequestException(result.error);
    return { comment: result };
  }

  @RequirePerms('comments:create')
  @Patch(':commentId')
  async update(
    @Req() req: Req_,
    @Param('commentId') commentId: string,
    @Body() body: unknown,
  ) {
    const { body: newBody } = updateCommentSchema.parse(body);
    const result = await this.comments.update(commentId, newBody, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });

    if (!result) throw new NotFoundException('Comment not found');
    if ('error' in result) throw new ForbiddenException(result.error);
    return { comment: result };
  }

  @RequirePerms('comments:create')
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Req_,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.comments.remove(commentId, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });

    if (!result) throw new NotFoundException('Comment not found');
  }
}
