import { initContract } from "@ts-rest/core";
import { auditRouter } from "./audit.contract.js";
import { authContract } from "./auth.contract.js";
import { clientsRouter } from "./clients.contract.js";
import { devicesRouter } from "./device.contract.js";
import { invitesRouter } from "./invite.contract.js";
import { passwordRouter } from "./password.contract.js";
import { rolesRouter } from "./role.contract.js";
import { sessionRouter } from "./session.contract.js";

const c = initContract();

export const apiContract = c.router({
  auth: authContract,
  audit: auditRouter,
  devices: devicesRouter,
  roles: rolesRouter,
  sessions: sessionRouter,
  password: passwordRouter,
  invites: invitesRouter,
  clients: clientsRouter,
});

export * from "./audit.contract.js";
export * from "./auth.contract.js";
export * from "./clients.contract.js";
export * from "./device.contract.js";
export * from "./invite.contract.js";
export * from "./password.contract.js";
export * from "./role.contract.js";
export * from "./session.contract.js";

export type ApiContract = typeof apiContract;
