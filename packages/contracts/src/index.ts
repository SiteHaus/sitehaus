import { initContract } from "@ts-rest/core";
import { authContract } from "./auth.contract.js";
import { devicesRouter } from "./device.contract.js";
import { passwordRouter } from "./password.contract.js";
import { rolesRouter } from "./role.contract.js";
import { sessionRouter } from "./session.contract.js";

const c = initContract();
export const apiContract = c.router({
  auth: authContract,
  devices: devicesRouter,
  roles: rolesRouter,
  sessions: sessionRouter,
  password: passwordRouter,
});

export * from "./auth.contract.js";
export * from "./device.contract.js";
export * from "./password.contract.js";
export * from "./role.contract.js";
export * from "./session.contract.js";

export type ApiContract = typeof apiContract;
