"use client";

import { useParams } from "next/navigation";
import { ClientDetailView } from "./_components/client-detail-view";

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  return <ClientDetailView clientId={clientId} />;
}
