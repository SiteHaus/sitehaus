import { Controller, ForbiddenException, Get, Param, UseGuards } from "@nestjs/common";
import { AccessGuard } from "../auth/access.guard";
import { CurrentUser, type LighthausUser } from "../auth/current-user.decorator";
import { StatusService } from "./status.service";

@Controller("status")
@UseGuards(AccessGuard)
export class StatusController {
  constructor(private readonly status: StatusService) {}

  @Get()
  board(@CurrentUser() user: LighthausUser) {
    return this.status.boardFor(user);
  }

  @Get(":monitorId")
  async detail(@CurrentUser() user: LighthausUser, @Param("monitorId") monitorId: string) {
    const detail = await this.status.monitorDetailFor(user, monitorId);
    if (!detail) throw new ForbiddenException("Monitor not in scope");
    return detail;
  }
}
