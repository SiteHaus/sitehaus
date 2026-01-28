import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ComponentProps, useCallback, useMemo } from "react";

export type VerificationMode = "email" | "reset" | "login";
export type AuthParams = {
  client?: string;
  next?: string;
  email?: string;
  mode?: VerificationMode;
  oauth_params?: string;
};

const AUTH_KEYS: (keyof AuthParams)[] = [
  "client",
  "email",
  "mode",
  "next",
  "oauth_params",
] as const;

const toRecord = (init?: URLSearchParams | null): Record<string, string> => {
  const r: Record<string, string> = {};
  if (!init) return r;

  for (const [k, v] of init.entries()) r[k] = v;
  return r;
};

const appendQuery = (
  path: string,
  params: Record<string, string | undefined>
) => {
  const url = new URL(path, "http://dummy");
  const q = new URLSearchParams(url.search);

  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;

    q.set(k, v);
  }

  const qs = q.toString();
  const pathnameOnly = url.pathname;
  return qs ? `${pathnameOnly}?${qs}` : pathnameOnly;
};

type BuildOpts = {
  preserve?: (keyof AuthParams)[];
  add?: Partial<AuthParams>;
  strip?: (keyof AuthParams)[];
};

export const useAuthParams = (): AuthParams => {
  const sp = useSearchParams();
  return useMemo(
    () => ({
      client: sp.get("client") || undefined,
      next: sp.get("next") || undefined,
      email: sp.get("email") || undefined,
      mode: (sp.get("mode") as VerificationMode) || undefined,
      oauth_params: sp.get("oauth_params") || undefined,
    }),
    [sp]
  );
};

export const useAuthNav = () => {
  const router = useRouter();
  const sp = useSearchParams();
  const current = useAuthParams();

  const build = useCallback(
    (path: string, opts: BuildOpts = {}) => {
      const preserve = new Set(opts.preserve ?? AUTH_KEYS);
      const strip = new Set(opts.strip ?? []);

      const base = toRecord(sp);
      const carry: Record<string, string | undefined> = {};
      for (const key of preserve) {
        if (strip.has(key)) continue;
        const v = base[key];
        if (v) carry[key] = v;
      }

      const merged = { ...carry, ...(opts.add ?? {}) };
      return appendQuery(path, merged);
    },
    [sp]
  );

  const push = useCallback(
    (path: string, opts?: BuildOpts) => router.push(build(path, opts)),
    [router, build]
  );

  const replace = useCallback(
    (path: string, opts?: BuildOpts) => router.replace(build(path, opts)),
    [router, build]
  );

  return { params: current, build, push, replace };
};

export const AuthLink = ({
  href,
  preserve,
  add,
  strip,
  ...rest
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  preserve?: (keyof AuthParams)[];
  add?: Partial<AuthParams>;
  strip?: (keyof AuthParams)[];
}) => {
  const { build } = useAuthNav();
  const built = build(href, { preserve, add, strip });
  return <Link href={built} {...rest} />;
};
