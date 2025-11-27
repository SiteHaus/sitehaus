import { RequireParams } from "@/lib/require-params";
import RequestPasswordResetContainer from "./request-password-reset-container";

export default function Home() {
  return (
    <RequireParams requireClient requireNext>
      <RequestPasswordResetContainer />
    </RequireParams>
  );
}
