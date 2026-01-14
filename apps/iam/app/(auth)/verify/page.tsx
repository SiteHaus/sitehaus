"use client";

import { Suspense } from "react";
import VerifyCodeContainer from "./verify-container";

export default function AuthVerifyCodeRoute() {
  return (
    <Suspense fallback={null}>
      <VerifyCodeContainer />
    </Suspense>
  );
}
