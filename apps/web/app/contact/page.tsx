"use client";

import Image from "next/image";
import { ProjectWizard } from "./wizard";

const bubbles = [
  {
    src: "/Responsible_Delivery_500p_Textured_V1.png",
    alt: "",
    style: { bottom: "18%", left: "2%", rotate: "-6deg", animationDelay: "0s" },
  },
  {
    src: "/Clear_Scope_500p_Textured_V1.png",
    alt: "",
    style: { bottom: "8%", left: "28%", rotate: "5deg", animationDelay: "0.9s" },
  },
  {
    src: "/Modern_Stack_500p_Textured_V1.png",
    alt: "",
    style: { bottom: "36%", left: "14%", rotate: "-3deg", animationDelay: "1.6s" },
  },
  {
    src: "/Long-Term_Partners_Textured_500p_V1.png",
    alt: "",
    style: { bottom: "6%", right: "2%", rotate: "7deg", animationDelay: "0.4s" },
  },
];

export default function ContactPage() {
  return (
    <main style={{ minHeight: "100vh", paddingTop: "88px" }}>
      <div
        className="container mx-auto px-6 sm:px-8 grid grid-cols-1 md:grid-cols-2"
        style={{
          gap: "48px",
          alignItems: "start",
          width: "100%",
          maxWidth: "1100px",
          paddingTop: "48px",
          paddingBottom: "64px",
        }}
      >
        {/* Left — heading + info + floating sailors */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div>
            <span className="eyebrow">Get in touch</span>
            <h1
              className="display-heading"
              style={{
                fontSize: "clamp(40px, 6.5vw, 96px)",
                margin: "16px 0 24px",
                lineHeight: 1.0,
              }}
            >
              Say <em>hello</em>.
            </h1>
            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.65,
                color: "var(--clay-700)",
                maxWidth: "400px",
                marginBottom: "40px",
              }}
            >
              Tell us a little about what you&rsquo;re trying to build &mdash; we&rsquo;ll write
              back within a day. No commitment, no sales pitch.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Email", value: "sitehausdev@gmail.com" },
                { label: "Location", value: "Utah, USA" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--ink-300)",
                      width: "64px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ fontSize: "14px", color: "var(--clay-700)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating sailor illustrations */}
          <div
            aria-hidden="true"
            className="hidden md:block"
            style={{ position: "relative", minHeight: "280px", marginTop: "32px" }}
          >
            {bubbles.map((b) => (
              <div
                key={b.src}
                style={{
                  position: "absolute",
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-md)",
                  animation: `float 5s ease-in-out ${b.style.animationDelay} infinite`,
                  ...b.style,
                }}
              >
                <Image src={b.src} alt={b.alt} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Right — wizard card */}
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--line-soft)",
            borderRadius: "14px",
            padding: "28px 28px 32px",
            boxShadow: "var(--shadow-xs)",
            display: "flex",
            flexDirection: "column",
            minHeight: "480px",
          }}
        >
          <ProjectWizard />
        </div>
      </div>
    </main>
  );
}
