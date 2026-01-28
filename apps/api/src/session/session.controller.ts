import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { type AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { VerifiedOptional } from 'src/auth/verified/verified.guard';
import { SessionService } from './session.service';

@VerifiedOptional()
@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @RequirePerms('sessions:read')
  @Get()
  async list(@Req() req: AuthedRequest & { client?: { id: string } }) {
    const { userId, sessionId: currentSessionId } = req.user!;
    const clientId = req.client!.id;
    const rows = await this.sessions.listForUserClient(userId, clientId);

    return {
      sessions: rows.map((session) => ({
        ...session,
        isCurrent: session.id === currentSessionId,
      })),
    };
  }

  @RequirePerms('sessions:revoke')
  @Post('revoke-others')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOthers(@Req() req: AuthedRequest) {
    const { userId, sessionId } = req.user!;
    await this.sessions.revokeAllOthers(userId, sessionId);
  }

  @RequirePerms('sessions:revoke')
  @Post(':sessionId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOne(
    @Param('sessionId') sid: string,
    @Req() req: AuthedRequest & { client?: { id: string } },
  ) {
    await this.sessions.revoke(sid, {
      clientId: req.client!.id,
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }
}
