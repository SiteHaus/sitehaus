import { MeClient, MeSession, MeUser, ProjectItem } from "@site-haus/contracts";
import { refreshOnce, runSingleRefresh } from "@site-haus/sdk";
import { create } from "zustand";
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

  projects: ProjectItem[];
  setProjects: (projects: ProjectItem[]) => void;
  loadMyProjects: () => Promise<void>;

  managedClientId: string | null;
  setManagedClientId: (id: string | null) => void;

  bootstrapped: boolean;

  setAccess: (p: { accessToken: string; accessExpiration: number }) => void;
  setMe: (p: { user: MeUser | null; session: MeSession | null; permissions?: string[] }) => void;
  clearAuth: () => void;

  bootstrap: () => Promise<void>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  me: () => Promise<void>;

  hasPerm: (perm: string) => boolean;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  accessExpiration: null,

  user: null,
  session: null,
  permissions: new Set(),

  clients: [],
  setClients: (clients) => set({ clients }),

  projects: [],
  setProjects: (projects) => set({ projects }),

  managedClientId: null,
  setManagedClientId: (id) => set({ managedClientId: id }),

  loadMyClients: async () => {
    const { clients } = getApi();
    const r = await clients.meClients();
    if (r.status === 200) set({ clients: r.body.clients });
  },

  loadMyProjects: async () => {
    const { projects } = getApi();
    const clientId = get().managedClientId ?? undefined;
    const r = await projects.list({
      query: { clientId },
    });
    if (r.status === 200) set({ projects: r.body.projects });
  },

  bootstrapped: false,

  setAccess: ({ accessToken, accessExpiration }) => set({ accessToken, accessExpiration }),

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
    // If we already have a valid access token in memory, skip the refresh
    const currentState = get();
    const now = Math.floor(Date.now() / 1000);
    const hasValidToken =
      currentState.accessToken &&
      currentState.accessExpiration &&
      currentState.accessExpiration > now;

    if (hasValidToken) {
      await get().me();
      if (currentState.clients.length === 0) {
        await get().loadMyClients();
      }
      const visibleClients = get().clients.filter((c) => !c.hidden && !c.firstParty);
      const onlyClient = visibleClients.length === 1 ? visibleClients[0] : undefined;
      if (onlyClient && !get().managedClientId) {
        set({ managedClientId: onlyClient.id });
        await get().me();
      }
      set({ bootstrapped: true });
      return;
    }

    // No valid token in memory — try silent refresh via sh_refresh HttpOnly cookie
    try {
      await runSingleRefresh(refreshOnce);
    } catch {
      get().clearAuth();
      set({ bootstrapped: true });
      return;
    }

    if (get().accessToken) {
      await get().me();
      await get().loadMyClients();
      const visibleClients = get().clients.filter((c) => !c.hidden && !c.firstParty);
      const onlyClient = visibleClients.length === 1 ? visibleClients[0] : undefined;
      if (onlyClient && !get().managedClientId) {
        set({ managedClientId: onlyClient.id });
        await get().me();
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
    } else if (r.status === 403) {
      get().clearAuth();
      throw new Error("mfa_pending");
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
}));
