"use client";

import { useIsEmployee } from "@/hooks/use-is-employee";
import { ClientHomeView } from "./_components/client-home-view";
import { EmployeeHomeView } from "./_components/employee-home-view";

export default function Home() {
  const isEmployee = useIsEmployee();
  return isEmployee ? <EmployeeHomeView /> : <ClientHomeView />;
}
