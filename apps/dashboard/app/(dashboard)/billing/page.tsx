"use client";

import { useIsEmployee } from "@/hooks/use-is-employee";
import { AdminBillingView } from "./_components/admin-billing-view";
import { ClientBillingView } from "./_components/client-billing-view";

export default function BillingPage() {
  const isEmployee = useIsEmployee();
  return isEmployee ? <AdminBillingView /> : <ClientBillingView />;
}
