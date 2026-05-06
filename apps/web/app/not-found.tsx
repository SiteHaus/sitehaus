import Link from "next/link";
import { MoveRight } from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--parchment-50)" }}
    >
      <div className="text-center max-w-xl">
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 0",
            fontSize: "clamp(80px, 15vw, 140px)",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--parchment-300)",
            marginBottom: "24px",
            display: "block",
          }}
        >
          404
        </p>
        <h1
          className="section-heading"
          style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: "16px" }}
        >
          Page not found.
        </h1>
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.65,
            color: "var(--clay-600)",
            marginBottom: "36px",
          }}
        >
          This page doesn&rsquo;t exist or may have moved. Head back to the homepage or reach out if
          you think something&rsquo;s broken.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              fontWeight: 500,
              padding: "10px 22px",
              borderRadius: "999px",
              background: "var(--terracotta-500)",
              color: "var(--parchment-50)",
              textDecoration: "none",
            }}
          >
            Go home <MoveRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              fontWeight: 500,
              padding: "10px 22px",
              borderRadius: "999px",
              border: "1px solid var(--line)",
              color: "var(--clay-700)",
              textDecoration: "none",
              background: "transparent",
            }}
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
