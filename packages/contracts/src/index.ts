import { initContract } from "@ts-rest/core";
import { assetsRouter } from "./assets.contract.js";
import { auditRouter } from "./audit.contract.js";
import { authContract } from "./auth.contract.js";
import { businessProfilesRouter } from "./business-profiles.contract.js";
import { clientsRouter } from "./clients.contract.js";
import { commentsRouter } from "./comments.contract.js";
import { designDocumentsRouter } from "./design-documents.contract.js";
import { devicesRouter } from "./device.contract.js";
import { invitesRouter } from "./invite.contract.js";
import { passwordRouter } from "./password.contract.js";
import { projectsRouter } from "./projects.contract.js";
import { rolesRouter } from "./role.contract.js";
import { sessionRouter } from "./session.contract.js";
import { ticketsRouter } from "./tickets.contract.js";

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
  projects: projectsRouter,
  businessProfiles: businessProfilesRouter,
  designDocuments: designDocumentsRouter,
  tickets: ticketsRouter,
  assets: assetsRouter,
  comments: commentsRouter,
});

export * from "./assets.contract.js";
export * from "./audit.contract.js";
export * from "./auth.contract.js";
export * from "./business-profiles.contract.js";
export * from "./clients.contract.js";
export * from "./comments.contract.js";
export * from "./design-documents.contract.js";
export * from "./device.contract.js";
export * from "./invite.contract.js";
export * from "./password.contract.js";
export * from "./projects.contract.js";
export * from "./role.contract.js";
export * from "./session.contract.js";
export * from "./tickets.contract.js";

export type ApiContract = typeof apiContract;
