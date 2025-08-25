import { Inject, Injectable } from '@nestjs/common';
import { type Db, DRIZZLE } from 'src/db/db.module';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  findByEmail(email: string) {
    this.db.query.usersTable.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    });
  }
}
