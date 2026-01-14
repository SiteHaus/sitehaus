import { MeClient, MeSession, MeUser } from "@site-haus/contracts";
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

  clients: MeClient[];
  setClients: (clients: MeClient[]) => void;
  loadMyClients: () => Promise<void>;

  hydrated: boolean;
  setHydrated: () => void;

  bootstrapped: boolean;

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

      clients: [],
      setClients: (clients) => set({ clients }),

      loadMyClients: async () => {
        const { clients } = getApi();
        const r = await clients.meClients();
        if (r.status === 200) set({ clients: r.body.clients });
      },

      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      bootstrapped: false,

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
        // If we already have a valid access token in memory (e.g., just logged in),
        // skip the refresh and just fetch user data
        const currentState = get();
        const now = Math.floor(Date.now() / 1000);
        const hasValidToken =
          currentState.accessToken &&
          currentState.accessExpiration &&
          currentState.accessExpiration > now;

        if (hasValidToken) {
          // Already have a valid token, just ensure user data is loaded
          if (!currentState.user) {
            await get().me();
            await get().loadMyClients();
          }
          set({ bootstrapped: true });
          return;
        }

        // No valid token in memory, try to refresh using cookie
        try {
          await refreshOnce();
        } catch {
          // Refresh failed - user needs to log in
          get().clearAuth();
          set({ bootstrapped: true });
          return;
        }

        // If refresh succeeded, fetch user data
        if (get().accessToken) {
          await get().me();
          await get().loadMyClients();
        }
        set({ bootstrapped: true });
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
