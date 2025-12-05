import { RequireParams } from "@/lib/require-params";
import { Metadata } from "next";
import { Suspense } from "react";
import VerifyCodeContainer from "./verify-container";

export const metadata: Metadata = {
  title: "Identity Gateway - Verify",
  description: "Verify the code we've sent to your email.",
};

export default function AuthVerifyCodeRoute() {
  return (
    <Suspense fallback={null}>
      <RequireParams requireClient requireNext>
        <VerifyCodeContainer />
      </RequireParams>
    </Suspense>
  );
}
