import { MeSession, MeUser } from "@site-haus/contracts";
import { refreshOnce } from "@site-haus/sdk";
import { create } from "zustand";
import { createJSONStorage, persist, PersistOptions } from "zustand/middleware";
import { getApi } from "./api.js";

type AuthState = {
  accessToken: string | null;
  accessExpiration: number | null;

  user: MeUser | null;
  session: MeSession | null;
  permissions: Set<string>;

  hydrated: boolean;
  setHydrated: () => void;

  setAccess: (p: { accessToken: string; accessExpiration: number }) => void;
  setMe: (p: {
    user: MeUser | null;
    session: MeSession | null;
    permissions?: string[];
  }) => void;
  clearAuth: () => void;

  bootstrap: () => Promise<void>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  me: () => Promise<void>;

  hasPerm: (perm: string) => boolean;
};

type Persisted = Pick<
  AuthState,
  "user" | "session" | "accessToken" | "accessExpiration"
>;

const persistOptions: PersistOptions<AuthState, Persisted> = {
  name: "auth",
  storage:
    typeof window !== "undefined"
      ? createJSONStorage<Persisted>(() => localStorage)
      : undefined,
  partialize: (s) => ({
    user: s.user,
    session: s.session,
    accessToken: s.accessToken,
    accessExpiration: s.accessExpiration,
  }),
  onRehydrateStorage: () => (state) => {
    state?.setHydrated();
  },
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], Persisted>(
    (set, get) => ({
      accessToken: null,
      accessExpiration: null,

      user: null,
      session: null,
      permissions: new Set(),

      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

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
        const { accessToken, accessExpiration } = get();
        const now = Math.floor(Date.now() / 1000);

        const hasFreshToken =
          !!accessToken &&
          typeof accessExpiration === "number" &&
          accessExpiration > now + 30;

        if (hasFreshToken) {
          await get().me();
          return;
        }

        try {
          await refreshOnce();
        } catch {
          get().clearAuth();
          return;
        }

        if (get().accessToken) {
          await get().me();
        }
      },

      login: async ({ email, password }) => {
        const { auth } = getApi();
        const r = await auth.loginOnly.login({ body: { email, password } });
        if (r.status !== 200) throw new Error("");

        const { accessToken, accessTokenExpiresIn } = r.body;
        const now = Math.floor(Date.now() / 1000);

        get().setAccess({
          accessToken,
          accessExpiration: now + accessTokenExpiresIn,
        });
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
