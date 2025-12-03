import { RequireParams } from "@/lib/require-params";
import { Metadata } from "next";
import VerifyCodeContainer from "./verify-container";

export const metadata: Metadata = {
  title: "Identity Gateway - Verify",
  description: "Verify the code we've sent to your email.",
};

export default function AuthVerifyCodeRoute() {
  return (
    <RequireParams requireClient requireNext>
      <VerifyCodeContainer />
    </RequireParams>
  );
}
