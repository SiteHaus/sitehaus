export type TsRestResponse<TBody = any> = {
  status: number;
  body: TBody;
  headers?: Headers;
};

export type FieldIssue = { path: (string | number)[]; message: string };

export type ParsedApiError =
  | {
      kind: "validation";
      message: string;
      details: FieldIssue[];
      status: number;
      retryAfter?: number;
    }
  | { kind: "http"; message: string; status: number; retryAfter?: number }
  | { kind: "server"; message: string; status: number; retryAfter?: number }
  | { kind: "network"; message: string }
  | { kind: "unknown"; message: string };

export function isApiResponse(x: unknown): x is TsRestResponse<any> {
  return !!x && typeof x === "object" && "status" in x && "body" in x;
}

export function parseRetryAfter(h?: Headers | null): number | undefined {
  if (!h) return;
  const v = h.get?.("Retry-After");
  if (!v) return;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseApiError(resOrErr: unknown): ParsedApiError {
  if (!isApiResponse(resOrErr)) {
    const msg =
      (resOrErr as any)?.message ?? "Network error. Please check your connection and try again.";
    return { kind: "network", message: String(msg) };
  }

  const { status, body, headers } = resOrErr as TsRestResponse<any>;
  const retryAfter = parseRetryAfter(headers as Headers);

  if (
    status === 400 &&
    body &&
    typeof body === "object" &&
    body.error?.type === "validation_error"
  ) {
    const message = body.error?.message ?? "Invalid request payload.";
    const details: FieldIssue[] = Array.isArray(body.error?.details)
      ? body.error.details.map((d: any) => ({
          path: Array.isArray(d?.path) ? d.path : [],
          message: String(d?.message ?? "Invalid value"),
        }))
      : [];
    return { kind: "validation", message, details, status, retryAfter };
  }

  if (body && typeof body === "object" && body.error?.type === "http_error") {
    const message = typeof body.message === "string" ? body.message : "Request failed.";
    return { kind: "http", message, status, retryAfter };
  }

  if (body && typeof body === "object" && body.error?.type === "server_error") {
    const message = String(body.error?.message ?? "Unexpected server error");
    return { kind: "server", message, status, retryAfter };
  }

  const generic =
    (body && typeof body === "object" && body.message) || `Request failed with status ${status}.`;
  return { kind: "unknown", message: String(generic) };
}

export function getDisplayMessage(err: ParsedApiError): string {
  switch (err.kind) {
    case "validation":
      return err.message;
    case "http":
    case "server":
    case "unknown":
      return err.message;
    case "network":
      return err.message;
  }
}
