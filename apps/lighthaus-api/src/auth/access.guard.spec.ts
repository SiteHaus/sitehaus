import { jest } from "@jest/globals";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { MonitorRepository } from "../persistence/monitor.repository";
import { AccessGuard } from "./access.guard";
import type { AuthedRequest } from "./current-user.decorator";

function ctxWith(req: Partial<AuthedRequest>): { ctx: ExecutionContext; req: AuthedRequest } {
  const full = { headers: { authorization: "Bearer tok" }, ...req } as AuthedRequest;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => full }),
  } as unknown as ExecutionContext;
  return { ctx, req: full };
}

function guard(
  payload: Record<string, unknown>,
  opts: { sessionValid?: boolean; isStaff?: boolean } = {},
) {
  const jwt = { verifyAsync: jest.fn(async () => payload) } as unknown as JwtService;
  const repo = {
    sessionValid: jest.fn(async () => opts.sessionValid ?? true),
    isStaffAdmin: jest.fn(async () => opts.isStaff ?? false),
  } as unknown as MonitorRepository;
  return new AccessGuard(jwt, repo);
}

const base = { sub: "u1", sid: "s1", aud: "c1", iat: 0, exp: 9_999_999_999 };

describe("AccessGuard", () => {
  it("rejects an mfa:pending token before checking the session (MFA bypass regression)", async () => {
    const { ctx } = ctxWith({});
    await expect(guard({ ...base, mfa: "pending" }).canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("accepts a completed token with a live session and populates req.user", async () => {
    const { ctx, req } = ctxWith({});
    await expect(
      guard({ ...base, mfa: "complete" }, { isStaff: true }).canActivate(ctx),
    ).resolves.toBe(true);
    expect(req.user).toMatchObject({
      userId: "u1",
      clientId: "c1",
      sessionId: "s1",
      isStaff: true,
    });
  });

  it("rejects when the session is not live", async () => {
    const { ctx } = ctxWith({});
    await expect(
      guard({ ...base }, { sessionValid: false }).canActivate(ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a missing bearer token", async () => {
    const { ctx } = ctxWith({ headers: {} } as Partial<AuthedRequest>);
    await expect(guard({ ...base }).canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
