import { redirect } from "next/navigation";

interface HomeProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function Home({ searchParams }: HomeProps) {
  const qp = new URLSearchParams(
    Object.entries(searchParams ?? {}).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((x) => [k, x]) : v != null ? [[k, v]] : []
    )
  ).toString();

  redirect(`/login${qp ? `?${qp}` : ""}`);
}
