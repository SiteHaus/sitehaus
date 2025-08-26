import { Inject, Injectable } from '@nestjs/common';
import { schema, User, type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/db.module';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  findByEmail(email: string) {
    const e = normalizeEmail(email);
    return this.db.query.usersTable.findFirst({
      where: (t, { eq }) => eq(t.email, e),
    });
  }

  findById(id: string) {
    return this.db.query.usersTable.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
  }

  getPasswordCredential(userId: string) {
    return this.db.query.passwordCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });
  }

  async createUser(
    input: Pick<User, 'email' | 'firstName' | 'lastName'>,
  ): Promise<User> {
    const [u] = await this.db
      .insert(schema.usersTable)
      .values({
        email: normalizeEmail(input.email),
        firstName: input.firstName,
        lastName: input.lastName,
      })
      .returning();

    return u!;
  }

  async setPassword(userId: string, passwordHash: string) {
    const [pc] = await this.db
      .insert(schema.passwordCredentialsTable)
      .values({ userId, passwordHash })
      .onConflictDoUpdate({
        target: schema.passwordCredentialsTable.userId,
        set: { passwordHash, updatedAt: new Date() },
      })
      .returning();

    return pc!;
  }

  async createUserWithPassword(input: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }) {
    const email = normalizeEmail(input.email);

    return this.db.transaction(async (tx) => {
      try {
        const [user] = await tx
          .insert(schema.usersTable)
          .values({
            email,
            firstName: input.firstName,
            lastName: input.lastName,
          })
          .returning();

        await tx
          .insert(schema.passwordCredentialsTable)
          .values({ userId: user!.id, passwordHash: input.passwordHash });

        return user!;
      } catch (err: any) {
        // Postgres unique violation code
        if (err?.code === '23505') {
          const existing = await tx.query.usersTable.findFirst({
            where: (t, { eq }) => eq(t.email, email),
          });

          if (existing) {
            const e = new Error('User already exists.');
            (e as any).code = 'USER_EXISTS';
            throw e;
          }
        }

        throw err;
      }
    });
  }
}
