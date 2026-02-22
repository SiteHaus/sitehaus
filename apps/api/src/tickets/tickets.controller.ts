import {
  BadRequestException,
  Body,
  Controller,
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
  createTicketSchema,
  listTicketsQuerySchema,
  ticketAssignSchema,
  ticketStatusTransitionSchema,
  updateTicketSchema,
} from '@site-haus/validation/forms/ticket';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ClientInRequest } from 'src/clients/client.guard';
import { TicketsService } from './tickets.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @RequirePerms('tickets:read')
  @Get()
  async list(@Req() req: Req_, @Query() query: unknown) {
    const parsed = listTicketsQuerySchema.parse(query);
    return this.tickets.list(parsed, req.client!.id, req.client!.firstParty);
  }

  @RequirePerms('tickets:read')
  @Get(':ticketId')
  async get(@Req() req: Req_, @Param('ticketId') ticketId: string) {
    const ticket = await this.tickets.getById(ticketId, req.client!.id, req.client!.firstParty);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return { ticket };
  }

  @RequirePerms('tickets:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Req_, @Body() body: unknown) {
    const parsed = createTicketSchema.parse(body);
    const result = await this.tickets.create(parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    }, req.client!.firstParty);
    if ('error' in result) throw new ForbiddenException(result.error);
    return { ticket: result };
  }

  @RequirePerms('tickets:read')
  @Patch(':ticketId')
  async update(
    @Req() req: Req_,
    @Param('ticketId') ticketId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateTicketSchema.parse(body);
    const ticket = await this.tickets.update(ticketId, req.client!.id, parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    }, req.client!.firstParty);
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
}
