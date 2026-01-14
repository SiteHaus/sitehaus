"use client";

import { Suspense } from "react";
import AcceptInviteContainer from "./accept-invite-container";

function AcceptInvitePage() {
  return <AcceptInviteContainer />;
}

export default function AcceptInviteRoute() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitePage />
    </Suspense>
  );
}
