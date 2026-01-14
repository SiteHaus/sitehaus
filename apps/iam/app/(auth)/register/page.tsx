"use client";

import { Suspense } from "react";
import RegisterContainer from "./register-container";

export default function AuthRegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterContainer />
    </Suspense>
  );
}
