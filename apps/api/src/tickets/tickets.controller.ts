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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketAssignSchema,
  ticketStatusTransitionSchema,
  updateTicketSchema,
} from '@site-haus/validation/forms/ticket';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ClientInRequest } from 'src/clients/client.guard';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketsService } from './tickets.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly attachments: TicketAttachmentsService,
  ) {}

  @RequirePerms('tickets:read')
  @Get()
  async list(@Req() req: Req_, @Query() query: unknown) {
    const parsed = listTicketsQuerySchema.parse(query);
    return this.tickets.list(parsed, req.client!.id, req.client!.firstParty);
  }

  @RequirePerms('tickets:read')
  @Get(':ticketId')
  async get(@Req() req: Req_, @Param('ticketId') ticketId: string) {
    const ticket = await this.tickets.getById(
      ticketId,
      req.client!.id,
      req.client!.firstParty,
    );
    if (!ticket) throw new NotFoundException('Ticket not found');
    return { ticket };
  }

  @RequirePerms('tickets:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Req_, @Body() body: unknown) {
    const parsed = createTicketSchema.parse(body);
    const result = await this.tickets.create(
      parsed,
      {
        userId: req.user!.userId,
        clientId: req.client!.id,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
      req.client!.firstParty,
    );
    if ('error' in result) throw new ForbiddenException(result.error);
    return { ticket: result };
  }

  @RequirePerms('tickets:manage')
  @Patch(':ticketId')
  async update(
    @Req() req: Req_,
    @Param('ticketId') ticketId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateTicketSchema.parse(body);
    const ticket = await this.tickets.update(
      ticketId,
      req.client!.id,
      parsed,
      {
        userId: req.user!.userId,
        clientId: req.client!.id,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
      req.client!.firstParty,
    );
    if (!ticket) throw new NotFoundException('Ticket not found');
    return { ticket };
  }

  @RequirePerms('tickets:manage')
  @Patch(':ticketId/status')
  async transitionStatus(
    @Req() req: Req_,
    @Param('ticketId') ticketId: string,
    @Body() body: unknown,
  ) {
    const { status } = ticketStatusTransitionSchema.parse(body);
    const result = await this.tickets.transitionStatus(
      ticketId,
      req.client!.id,
      status,
      {
        userId: req.user!.userId,
        clientId: req.client!.id,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
      req.client!.firstParty,
    );
    if (!result) throw new NotFoundException('Ticket not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return { ticket: result };
  }

  @RequirePerms('tickets:manage')
  @Patch(':ticketId/assign')
  async assign(
    @Req() req: Req_,
    @Param('ticketId') ticketId: string,
    @Body() body: unknown,
  ) {
    const { assigneeId } = ticketAssignSchema.parse(body);
    const result = await this.tickets.assign(
      ticketId,
      req.client!.id,
      assigneeId,
      {
        userId: req.user!.userId,
        clientId: req.client!.id,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
      req.client!.firstParty,
    );
    if (!result) throw new NotFoundException('Ticket not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return { ticket: result };
  }

  @RequirePerms('tickets:read')
  @Get(':ticketId/attachments')
  async listAttachments(@Req() req: Req_, @Param('ticketId') ticketId: string) {
    try {
      const attachments = await this.attachments.list(
        ticketId,
        req.client!.id,
        req.client!.firstParty,
      );
      return { attachments };
    } catch (e: any) {
      if (e?.message === 'not_found')
        throw new NotFoundException('Ticket not found');
      throw e;
    }
  }

  @RequirePerms('tickets:create')
  @Post(':ticketId/attachments/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Req() req: Req_,
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    try {
      const attachment = await this.attachments.upload(
        ticketId,
        file,
        {
          userId: req.user!.userId,
          clientId: req.client!.id,
          ip: req.ip,
          ua: req.headers['user-agent'] as string | undefined,
        },
        req.client!.firstParty,
      );
      return { attachment };
    } catch (e: any) {
      if (e?.message === 'not_found')
        throw new NotFoundException('Ticket not found');
      throw e;
    }
  }

  @RequirePerms('tickets:manage')
  @Delete(':ticketId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Req() req: Req_,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    try {
      const deleted = await this.attachments.remove(
        attachmentId,
        ticketId,
        {
          userId: req.user!.userId,
          clientId: req.client!.id,
          ip: req.ip,
          ua: req.headers['user-agent'] as string | undefined,
        },
        req.client!.firstParty,
      );
      if (!deleted) throw new NotFoundException('Attachment not found');
    } catch (e: any) {
      if (e?.message === 'not_found')
        throw new NotFoundException('Ticket not found');
      throw e;
    }
  }
}
