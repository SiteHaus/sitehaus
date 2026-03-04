import { Controller, Get, Query, Req } from '@nestjs/common';
import { auditListQuery } from '@site-haus/contracts';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePerms('audit:read')
  @Get()
  async list(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Query() query: unknown,
  ) {
    const parsed = auditListQuery.parse(query);

    return this.audit.listForClient(req.client!.id, {
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
      action: parsed.action,
      targetType: parsed.targetType,
      targetId: parsed.targetId,
      userId: parsed.userId,
      limit: parsed.limit,
      cursor: parsed.cursor,
    });
  }
}
