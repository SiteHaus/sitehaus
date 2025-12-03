import { RequireParams } from "@/lib/require-params";
import { Metadata } from "next";
import RequestPasswordResetContainer from "./request-password-reset-container";

export const metadata: Metadata = {
  title: "Identity Gateway - Request Password Reset",
  description: "Request a password reset, and gain access to your account.",
};

export default function Home() {
  return (
    <RequireParams requireClient requireNext>
      <RequestPasswordResetContainer />
    </RequireParams>
  );
}
