"use client";

import { Suspense } from "react";
import RequestPasswordResetContainer from "./request-password-reset-container";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <RequestPasswordResetContainer />
    </Suspense>
  );
}
