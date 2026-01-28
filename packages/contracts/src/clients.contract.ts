import { clientTypeValues } from "@site-haus/validation/core/enums";
import { initContract } from "@ts-rest/core";
import z from "zod";
import { userBrief } from "./primitives.js";

const c = initContract();

export const clientMember = userBrief.extend({
  roles: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
    })
  ),
});

export type ClientMember = z.infer<typeof clientMember>;

export const meClient = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  type: z.enum(clientTypeValues),
  firstParty: z.boolean(),
  canManage: z.boolean(),
  hidden: z.boolean().optional(),
});

export type MeClient = z.infer<typeof meClient>;

export const clientsRouter = c.router({
  meMembers: {
    method: "GET",
    path: "/clients/me/members",
    responses: {
      200: c.type<{ members: ClientMember[] }>(),
    },
  },
  meClients: {
    method: "GET",
    path: "/clients/me/clients",
    responses: {
      200: c.type<{ clients: MeClient[] }>(),
    },
  },
});

export type ClientsRouter = typeof clientsRouter;
