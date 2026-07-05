import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { HeartbeatIngestGuard } from "./heartbeat.guard";

function ctxWith(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authHeader ? { authorization: authHeader } : {} }),
    }),
  } as unknown as ExecutionContext;
}

function guardWith(secret: string): HeartbeatIngestGuard {
  const config = { get: () => secret } as unknown as ConfigService;
  return new HeartbeatIngestGuard(config);
}

describe("HeartbeatIngestGuard", () => {
  it("fails closed with 503 when no secret is configured", () => {
    expect(() => guardWith("").canActivate(ctxWith("Bearer whatever"))).toThrow(
      ServiceUnavailableException,
    );
  });

  it("rejects a missing token", () => {
    expect(() => guardWith("s3cret").canActivate(ctxWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects a wrong token", () => {
    expect(() => guardWith("s3cret").canActivate(ctxWith("Bearer nope"))).toThrow(
      UnauthorizedException,
    );
  });

  it("accepts the correct token", () => {
    expect(guardWith("s3cret").canActivate(ctxWith("Bearer s3cret"))).toBe(true);
  });
});
