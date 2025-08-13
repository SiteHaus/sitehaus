import { create } from "zustand";
import { User } from "@site-haus/db/src/core/schema";
import { persist } from "zustand/middleware";

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      getUser: () => get().user,
    }),
    {
      name: "user",
    }
  )
);
