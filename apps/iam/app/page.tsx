import { redirect } from "next/navigation";

interface HomeProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: HomeProps) {
  const raw = (await searchParams) ?? {};

  const qp = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((x) => [k, x]) : v != null ? [[k, v]] : []
    )
  ).toString();

  redirect(`/login${qp ? `?${qp}` : ""}`);
}
