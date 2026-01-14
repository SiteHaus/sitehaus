"use client";

import { Suspense } from "react";
import LoginContainer from "./login-container";

export default function AuthLoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginContainer />
    </Suspense>
  );
}
