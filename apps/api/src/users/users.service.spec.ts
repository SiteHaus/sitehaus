import { UserExistsError } from 'src/errors/auth.errors';
import { UsersService } from './users.service';

describe('UsersService (unit, in-memory db stub)', () => {
  type UserRow = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  type PcRow = { userId: string; passwordHash: string; updatedAt?: Date };

  const makeDb = (seedUsers: UserRow[] = [], seedPcs: PcRow[] = []) => {
    const users = [...seedUsers];
    const pcs = [...seedPcs];

    let lastEmailEq: string | undefined;
    let lastPcUserIdEq: string | undefined;

    const db = {
      query: {
        usersTable: {
          findFirst: jest.fn(async ({ where }: any) => {
            try {
              const rhs = where?.(
                { email: 'email' } as any,
                { eq: (_: any, v: any) => v } as any,
              );
              if (typeof rhs === 'string') lastEmailEq = rhs;
            } catch {}
            return users.find((u) => u.email === lastEmailEq) ?? null;
          }),
        },
        passwordCredentialsTable: {
          findFirst: jest.fn(async ({ where }: any) => {
            try {
              const rhs = where?.(
                { userId: 'userId' } as any,
                { eq: (_: any, v: any) => v } as any,
              );
              if (typeof rhs === 'string') lastPcUserIdEq = rhs;
            } catch {}
            return pcs.find((p) => p.userId === lastPcUserIdEq) ?? null;
          }),
        },
      },

      insert: (_tbl: any) => ({
        values: (row: any) => {
          const isUserInsert =
            'email' in row && 'firstName' in row && 'lastName' in row;
          const isPcInsert =
            'userId' in row && 'passwordHash' in row && !('firstName' in row);

          if (isUserInsert) {
            const pendingUser: UserRow = {
              id: row.id ?? `u_${Math.random().toString(36).slice(2)}`,
              email: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
            };

            return {
              onConflictDoNothing: (_opts: any) => ({
                returning: () => {
                  const exists = users.some(
                    (u) => u.email === pendingUser.email,
                  );
                  if (exists) return [];
                  users.push(pendingUser);
                  return [pendingUser];
                },
              }),
              returning: () => {
                users.push(pendingUser);
                return [pendingUser];
              },
            };
          }

          if (isPcInsert) {
            const now = new Date();
            const existing = pcs.find((p) => p.userId === row.userId);
            if (existing) {
              existing.passwordHash = row.passwordHash;
              existing.updatedAt = now;
            } else {
              pcs.push({
                userId: row.userId,
                passwordHash: row.passwordHash,
                updatedAt: now,
              });
            }

            const getCurrent = () => pcs.find((p) => p.userId === row.userId)!;

            return {
              onConflictDoUpdate: (_opts: any) => ({
                returning: () => [getCurrent()],
              }),
              returning: () => [getCurrent()],
            };
          }

          throw new Error('unexpected insert payload');
        },
      }),

      update: () => ({
        set: () => ({ where: () => ({ returning: () => [] }) }),
      }),

      transaction: async (fn: any) =>
        fn({
          ...db,
          query: db.query,
          insert: db.insert,
          update: db.update,
        }),
    };

    return { db: db as any, users, pcs, getLastEmailEq: () => lastEmailEq };
  };

  it('findByEmail normalizes email (trim + lower)', async () => {
    const seed: UserRow[] = [
      { id: 'u1', email: 'foo@bar.com', firstName: 'F', lastName: 'B' },
    ];
    const { db, getLastEmailEq } = makeDb(seed);
    const svc = new UsersService(db);

    const row = await svc.findByEmail('  Foo@Bar.com  ');
    expect(row?.id).toBe('u1');
    expect(getLastEmailEq()).toBe('foo@bar.com');
  });

  it('createUser inserts and normalizes email', async () => {
    const { db, users } = makeDb();
    const svc = new UsersService(db);

    const u = await svc.createUser({
      email: '  Foo@Bar.com ',
      firstName: 'F',
      lastName: 'B',
    });

    expect(u.email).toBe('foo@bar.com');
    expect(users.find((x) => x.id === u.id)?.email).toBe('foo@bar.com');
  });

  it('createUser throws UserExistsError on duplicate email', async () => {
    const { db } = makeDb([
      { id: 'u1', email: 'taken@example.com', firstName: 'T', lastName: 'X' },
    ]);
    const svc = new UsersService(db);

    await expect(
      svc.createUser({
        email: 'Taken@Example.com',
        firstName: 'F',
        lastName: 'L',
      }),
    ).rejects.toBeInstanceOf(UserExistsError);
  });

  it('setPassword upserts password credential', async () => {
    const { db, pcs } = makeDb([], []);
    const svc = new UsersService(db);

    const first = await svc.setPassword('u1', 'hash1');
    expect(first.userId).toBe('u1');
    expect(pcs.find((p) => p.userId === 'u1')?.passwordHash).toBe('hash1');

    const second = await svc.setPassword('u1', 'hash2');
    expect(second.passwordHash).toBe('hash2');
    expect(pcs.find((p) => p.userId === 'u1')?.passwordHash).toBe('hash2');
    expect(pcs.find((p) => p.userId === 'u1')?.updatedAt).toBeInstanceOf(Date);
  });

  it('createUserWithPassword inserts user and credential in one tx', async () => {
    const { db, users, pcs } = makeDb();
    const svc = new UsersService(db);

    const user = await svc.createUserWithPassword({
      email: 'New@User.com',
      firstName: 'N',
      lastName: 'U',
      passwordHash: 'argon',
    });

    expect(user.email).toBe('new@user.com');
    expect(users.find((u) => u.id === user.id)).toBeTruthy();
    expect(pcs.find((p) => p.userId === user.id)?.passwordHash).toBe('argon');
  });

  it('createUserWithPassword throws UserExistsError on email conflict', async () => {
    const { db } = makeDb([
      { id: 'u1', email: 'dupe@x.com', firstName: 'D', lastName: 'X' },
    ]);
    const svc = new UsersService(db);

    await expect(
      svc.createUserWithPassword({
        email: 'Dupe@x.com',
        firstName: 'A',
        lastName: 'B',
        passwordHash: 'argon',
      }),
    ).rejects.toBeInstanceOf(UserExistsError);
  });

  it('getPasswordCredential returns row by userId', async () => {
    const { db } = makeDb(
      [{ id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B' }],
      [{ userId: 'u1', passwordHash: 'h' }],
    );
    const svc = new UsersService(db);

    const pc = await svc.getPasswordCredential('u1');
    expect(pc?.passwordHash).toBe('h');
  });
});
