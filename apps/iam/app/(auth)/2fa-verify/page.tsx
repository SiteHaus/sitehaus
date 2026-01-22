"use client";

import { Suspense } from "react";
import TwoFactorVerifyContainer from "./two-factor-verify-container";

export default function TwoFactorVerifyRoute() {
  return (
    <Suspense fallback={null}>
      <TwoFactorVerifyContainer />
    </Suspense>
  );
}
