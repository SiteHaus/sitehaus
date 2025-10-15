import type { Session } from "@site-haus/db/iam/sessions";
import type { User } from "@site-haus/db/iam/users";
import { create } from "zustand";
import { createJSONStorage, persist, PersistOptions } from "zustand/middleware";
import { getApi } from "./api.js";

type AuthState = {
  accessToken: string | null;
  accessExpiration: number | null;

  user: User | null;
  session: Session | null;
  permissions: Set<string>;

  setAccess: (p: { accessToken: string; accessExpiration: number }) => void;
  setMe: (p: {
    user: User | null;
    session: Session | null;
    permissions?: string[];
  }) => void;
  clearAuth: () => void;

  bootstrap: () => Promise<void>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  me: () => Promise<void>;

  hasPerm: (perm: string) => boolean;
};

type Persisted = Pick<AuthState, "user" | "session">;

const persistOptions: PersistOptions<AuthState, Persisted> = {
  name: "auth",
  storage:
    typeof window !== "undefined"
      ? createJSONStorage<Persisted>(() => localStorage)
      : undefined,
  partialize: (s) => ({
    user: s.user,
    session: s.session,
  }),
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], Persisted>(
    (set, get) => ({
      accessToken: null,
      accessExpiration: null,

      user: null,
      session: null,
      permissions: new Set(),

      setAccess: ({ accessToken, accessExpiration }) =>
        set({ accessToken, accessExpiration }),

      setMe: ({ user, session, permissions }) =>
        set({
          user,
          session,
          permissions: permissions ? new Set(permissions) : get().permissions,
        }),

      clearAuth: () =>
        set({
          accessToken: null,
          accessExpiration: null,
          user: null,
          session: null,
          permissions: new Set(),
        }),

      hasPerm: (perm: string) => get().permissions.has(perm),

      bootstrap: async () => {
        const { auth } = getApi();

        try {
          const r = await auth.public.refresh();
          if (r.status === 200) {
            const { accessToken, accessExpiration } = r.body;
            get().setAccess({ accessToken, accessExpiration });
          }
        } catch {}
        if (get().accessToken) {
          await get().me();
        }
      },

      login: async ({ email, password }) => {
        const { auth } = getApi();
        const r = await auth.loginOnly.login({ body: { email, password } });
        if (r.status !== 200) throw new Error("Login failed");
        const { accessToken, accessExpiration } = r.body;
        get().setAccess({ accessToken, accessExpiration });
        await get().me();
      },

      me: async () => {
        const { auth } = getApi();
        const r = await auth.private.me();
        if (r.status === 200) {
          const { user, session, permissions } = r.body;
          get().setMe({
            user: user ?? null,
            session: session ?? null,
            permissions,
          });
        }
      },

      logout: async () => {
        const { auth } = getApi();
        try {
          await auth.private.logout();
        } finally {
          get().clearAuth();
        }
      },
    }),
    persistOptions
  )
);
