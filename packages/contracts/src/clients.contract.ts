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

export const clientsRouter = c.router({
  meMembers: {
    method: "GET",
    path: "/clients/me/members",
    responses: {
      200: c.type<{ members: ClientMember[] }>(),
    },
  },
});

export type ClientsRouter = typeof clientsRouter;
