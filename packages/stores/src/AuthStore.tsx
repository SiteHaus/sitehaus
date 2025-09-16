import { create } from "zustand";
import { User } from "@site-haus/db/iam/users"
import { Session } from "@site-haus/db/iam/sessions";
import { persist } from "zustand/middleware";

interface AuthStore {
  user: User | null;
  session: Session | null;
  accessToken: String | null;
  accessExpiration: number | null;


  setAuth: (token: string, expiration: number, session: Session) => void
  setMe: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) =>({
            accessToken: null,
            accessExpiration: null,
            user: null,
            session: null,

            setAuth: (token, expiration, session) =>
                set({
                    accessToken: token,
                    accessExpiration: expiration,
                    session: session
                }),
            
            setMe: (user) =>
                set({
                    user: user
                }),

            clearAuth: () =>
                set({
                    accessToken: null,
                    accessExpiration: null,
                    user: null,
                    session:null,
                })
        }),
        {
            name: "auth",
            partialize: (state) => ({
                user: state.user,
                session: state.session,
            }),
        }
    )
);