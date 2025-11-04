import { RequireParams } from "@/lib/require-params";
import VerifyCodeContainer from "./verify-container";

export default function AuthVerifyCodeRoute() {
  return (
    <RequireParams requireClient requireNext>
      <VerifyCodeContainer />
    </RequireParams>
  );
}
