import { RequireParams } from "@/lib/require-params";
import { Metadata } from "next";
import { Suspense } from "react";
import RegisterContainer from "./register-container";

export const metadata: Metadata = {
  title: "Identity Gateway - Register",
  description:
    "Register for a SiteHaus account, and gain access to our first party client apps.",
};

export default function AuthRegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RequireParams requireClient requireNext>
        <RegisterContainer />
      </RequireParams>
    </Suspense>
  );
}
