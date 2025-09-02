export const schema = {
  usersTable: {
    id: {} as any,
    email: {} as any,
    firstName: {} as any,
    lastName: {} as any,
  },
  passwordCredentialsTable: {
    userId: {} as any,
    passwordHash: {} as any,
    updatedAt: {} as any,
  },
  sessionsTable: {
    id: {} as any,
    userId: {} as any,
    clientId: {} as any,
    refreshHash: {} as any,
    revokedAt: {} as any,
    expiresAt: {} as any,
  },
};

export const eq = (..._args: any[]) => ({ __op: 'eq', _args });
export const and = (..._args: any[]) => ({ __op: 'and', _args });
export const gt = (..._args: any[]) => ({ __op: 'gt', _args });
export const ne = (..._args: any[]) => ({ __op: 'ne', _args });
export const isNull = (..._args: any[]) => ({ __op: 'isNull', _args });
export const sql = (..._args: any[]) => ({ __op: 'sql', _args });

export type Db = any;
export const createDb = (..._args: any[]) => ({}) as any;
