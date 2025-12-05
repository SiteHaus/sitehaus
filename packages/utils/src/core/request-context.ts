import { BadRequestException } from "@nestjs/common";
import { type Request } from "express";

export type RequestContext = {
  clientId: string;
  ip?: string;
  ua?: string;
};

export type RequestContextOptions = {
  /** Header to read the client id from (default: 'x-client-id') */
  headerName?: string;
  /** If provided, use when header is missing (set this if you have a single first-party client) */
  defaultClientId?: string;
  /** Try additional proxy headers for IP (default: true) */
  trustProxy?: boolean;
  /** Throw 400 when client id is missing (default: true unless defaultClientId is set) */
  requireClientId?: boolean;
};

export const extractRequestContext = (
  req: Request,
  opts: RequestContextOptions = {}
) => {
  const {
    headerName = "x-client-id",
    defaultClientId,
    trustProxy = true,
    requireClientId = defaultClientId ? false : true,
  } = opts;

  const raw = req.headers[headerName] as string | string[] | undefined;
  const clientId = (Array.isArray(raw) ? raw[0] : raw) || defaultClientId || "";

  if (requireClientId && !clientId) {
    throw new BadRequestException(`Missing ${headerName} header`);
  }

  const ua = (req.headers["user-agent"] as string | undefined) || undefined;
  let ip: string | undefined;
  if (trustProxy) {
    const xff = req.headers["x-forwarded-for"] as string | undefined;
    ip = xff?.split(",")[0]?.trim();
    if (!ip)
      ip = (req.headers["cf-connecting-ip"] as string | undefined) ?? undefined;
    if (!ip) ip = (req.headers["x-real-ip"] as string | undefined) ?? undefined;
  }

  if (!ip) ip = req.socket.remoteAddress ?? undefined;

  if (ip && ip.startsWith("::ffff:")) ip = ip.slice(7);

  return { clientId, ip, ua };
};
