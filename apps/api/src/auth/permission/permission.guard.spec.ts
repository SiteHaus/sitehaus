import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { RolesService } from 'src/roles/roles.service';

type FakeReq = {
  user?: { userId: string; clientId: string };
  client?: { id: string; firstParty: boolean };
};

function ctxFor(req: FakeReq): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

/**
 * `getAllAndOverride` is called up to three times per canActivate in this
 * exact order: IS_PUBLIC_KEY, REQ_PERMS_ALL, REQ_PERMS_ANY. Stub by call
 * order rather than by key identity, since the real decorators export
 * opaque metadata keys this test has no need to import.
 */
function reflectorReturning(...values: unknown[]): Reflector {
  let call = 0;
  return {
    getAllAndOverride: () => values[call++],
  } as unknown as Reflector;
}

describe('PermissionGuard', () => {
  const STAFF_USER = 'staff-user-1';
  const CUSTOMER_USER = 'customer-user-1';
  const TARGET_CLIENT = 'client-target';

  function guardWith(opts: {
    isGenuineStaff?: boolean;
    permsForUserClient?: Set<string>;
    reflector: Reflector;
  }) {
    const roles = {
      isGenuineStaff: jest.fn().mockResolvedValue(opts.isGenuineStaff ?? false),
      permsForUserClient: jest
        .fn()
        .mockResolvedValue(opts.permsForUserClient ?? new Set()),
    } as unknown as RolesService;
    return { g: new PermissionGuard(opts.reflector, roles), roles };
  }

  it('downgrades req.client.firstParty to false for a real customer even though the caller app is first-party', async () => {
    // This is the exact shape ClientGuard produces for every dashboard
    // request: firstParty: true came from the app's own static client-key,
    // not from anything about this specific user.
    const req: FakeReq = {
      user: { userId: CUSTOMER_USER, clientId: TARGET_CLIENT },
      client: { id: TARGET_CLIENT, firstParty: true },
    };
    const { g, roles } = guardWith({
      isGenuineStaff: false,
      reflector: reflectorReturning(undefined, undefined, undefined),
    });

    await g.canActivate(ctxFor(req));

    expect(roles.isGenuineStaff).toHaveBeenCalledWith(CUSTOMER_USER);
    expect(req.client!.firstParty).toBe(false);
  });

  it('preserves req.client.firstParty = true for a genuine staff user', async () => {
    const req: FakeReq = {
      user: { userId: STAFF_USER, clientId: TARGET_CLIENT },
      client: { id: TARGET_CLIENT, firstParty: true },
    };
    const { g, roles } = guardWith({
      isGenuineStaff: true,
      reflector: reflectorReturning(undefined, undefined, undefined),
    });

    await g.canActivate(ctxFor(req));

    expect(roles.isGenuineStaff).toHaveBeenCalledWith(STAFF_USER);
    expect(req.client!.firstParty).toBe(true);
  });

  it('never calls isGenuineStaff when the caller app was never first-party to begin with', async () => {
    const req: FakeReq = {
      user: { userId: CUSTOMER_USER, clientId: TARGET_CLIENT },
      client: { id: TARGET_CLIENT, firstParty: false },
    };
    const { g, roles } = guardWith({
      reflector: reflectorReturning(undefined, undefined, undefined),
    });

    await g.canActivate(ctxFor(req));

    expect(roles.isGenuineStaff).not.toHaveBeenCalled();
    expect(req.client!.firstParty).toBe(false);
  });

  it('still throws ForbiddenException when the corrected user lacks the required permission', async () => {
    const req: FakeReq = {
      user: { userId: CUSTOMER_USER, clientId: TARGET_CLIENT },
      client: { id: TARGET_CLIENT, firstParty: true },
    };
    const { g } = guardWith({
      isGenuineStaff: false,
      permsForUserClient: new Set(),
      // isPublic: undefined, requiredAll: ['projects:read'], requiredAny: undefined
      reflector: reflectorReturning(undefined, ['projects:read'], undefined),
    });

    await expect(g.canActivate(ctxFor(req))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows the request when the corrected, real permission set satisfies the requirement', async () => {
    const req: FakeReq = {
      user: { userId: CUSTOMER_USER, clientId: TARGET_CLIENT },
      client: { id: TARGET_CLIENT, firstParty: false },
    };
    const { g } = guardWith({
      permsForUserClient: new Set(['projects:read']),
      reflector: reflectorReturning(undefined, ['projects:read'], undefined),
    });

    await expect(g.canActivate(ctxFor(req))).resolves.toBe(true);
  });

  it('public routes still bypass the permission check entirely', async () => {
    const req: FakeReq = {
      user: { userId: CUSTOMER_USER, clientId: TARGET_CLIENT },
      client: { id: TARGET_CLIENT, firstParty: true },
    };
    const { g, roles } = guardWith({
      isGenuineStaff: false,
      // isPublic: true — short-circuits before any perm check
      reflector: reflectorReturning(true),
    });

    await expect(g.canActivate(ctxFor(req))).resolves.toBe(true);
    // The correction still ran, even on a public route — defense in depth
    // for any public handler that still happens to read req.client.
    expect(roles.isGenuineStaff).toHaveBeenCalledWith(CUSTOMER_USER);
    expect(req.client!.firstParty).toBe(false);
  });
});
