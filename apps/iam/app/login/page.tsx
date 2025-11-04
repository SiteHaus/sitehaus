import { RequireParams } from "@/lib/require-params";
import LoginContainer from "./login-container";

export default function AuthLoginRoute() {
  return (
    <RequireParams requireClient requireNext>
      <LoginContainer />
    </RequireParams>
  );
}
