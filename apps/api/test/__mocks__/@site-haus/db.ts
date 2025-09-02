export type Db = any;
export const schema: any = { sessionsTable: {} };
export const and = (...args: any[]) => ({ __and: args });
export const eq = (...args: any[]) => ({ __eq: args });
export const gt = (...args: any[]) => ({ __gt: args });
export const ne = (...args: any[]) => ({ __ne: args });
export const isNull = (x: any) => ({ __isNull: x });
export const sql = String as any;
