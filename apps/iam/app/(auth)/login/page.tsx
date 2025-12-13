import { RequireParams } from "@/lib/require-params";
import { Metadata } from "next";
import { Suspense } from "react";
import LoginContainer from "./login-container";

export const metadata: Metadata = {
  title: "Identity Gateway - Login",
  description:
    "Login to your managed SiteHaus account, and be redirected back to our clients app.",
};

export default function AuthLoginRoute() {
  return (
    <Suspense fallback={null}>
      <RequireParams requireClient requireNext>
        <LoginContainer />
      </RequireParams>
    </Suspense>
  );
}
