export type RequestContext = {
  clientId: string;
  ip?: string;
  ua?: string;
};

export type RequestContextOptions = {
  headerName?: string;
  defaultClientId?: string;
  trustProxy?: boolean;
  requireClientId?: boolean;
};

export function extractRequestContext() {
  throw new Error('extractRequestContext not used in tests');
}
