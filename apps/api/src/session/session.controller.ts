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
import { VerifiedOptional } from 'src/auth/verified/verified.guard';
import { SessionService } from './session.service';

@VerifiedOptional()
@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Get()
  async list(@Req() req: AuthedRequest & { client?: { id: string } }) {
    const { userId } = req.user!;
    const clientId = req.client!.id;
    const rows = await this.sessions.listForUserClient(userId, clientId);

    return { sessions: rows };
  }

  @Post('revoke-others')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOthers(@Req() req: AuthedRequest) {
    const { userId, sessionId } = req.user!;
    await this.sessions.revokeAllOthers(userId, sessionId);
  }

  @Post(':sessionId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOne(@Param('sessionId') sid: string) {
    await this.sessions.revoke(sid);
  }
}
