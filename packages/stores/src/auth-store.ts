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

  managedClientId: string | null;
  setManagedClientId: (id: string | null) => void;

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

type Persisted = Pick<
  AuthState,
  "user" | "session" | "accessToken" | "accessExpiration" | "clients"
>;

const persistOptions: PersistOptions<AuthState, Persisted> = {
  name: "auth",
  // Use sessionStorage: cleared when tab closes, more secure than localStorage
  // Access tokens won't persist across browser sessions, reducing XSS risk window
  storage:
    typeof window !== "undefined"
      ? createJSONStorage<Persisted>(() => sessionStorage)
      : undefined,
  partialize: (s) => ({
    user: s.user,
    session: s.session,
    accessToken: s.accessToken,
    accessExpiration: s.accessExpiration,
    clients: s.clients,
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

      managedClientId: null,
      setManagedClientId: (id) => set({ managedClientId: id }),

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
        // If we already have a valid access token, skip the refresh
        const currentState = get();
        const now = Math.floor(Date.now() / 1000);
        const hasValidToken =
          currentState.accessToken &&
          currentState.accessExpiration &&
          currentState.accessExpiration > now;

        if (hasValidToken) {
          // Always fetch me() to get correct permissions for the selected client
          // (permissions depend on x-client-id header which changes with ?manage= param)
          await get().me();

          // Only fetch clients if not already loaded
          if (currentState.clients.length === 0) {
            await get().loadMyClients();
          }
          const allClients = get().clients;
          const isEmployee = allClients.some((c) => c.firstParty && c.canManage);
          const visibleClients = allClients.filter((c) => !c.hidden && !c.firstParty);
          const onlyClient = !isEmployee && visibleClients.length === 1 ? visibleClients[0] : undefined;
          if (onlyClient && !get().managedClientId) {
            set({ managedClientId: onlyClient.id });
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
          const allClients = get().clients;
          const isEmployee = allClients.some((c) => c.firstParty && c.canManage);
          const visibleClients = allClients.filter((c) => !c.hidden && !c.firstParty);
          const onlyClient = !isEmployee && visibleClients.length === 1 ? visibleClients[0] : undefined;
          if (onlyClient && !get().managedClientId) {
            set({ managedClientId: onlyClient.id });
          }
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
