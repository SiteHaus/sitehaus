"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { submitContact } from "./actions";

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
  const [state, formAction, isPending] = useActionState(submitContact, null);

  if (state && "success" in state) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "96px 32px",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <svg
            width="96"
            height="12"
            viewBox="0 0 600 12"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ display: "block", margin: "0 auto 24px", color: "var(--terracotta-500)" }}
          >
            <path
              d="M0,6 Q15,0 30,6 T60,6 T90,6 T120,6 T150,6 T180,6 T210,6 T240,6 T270,6 T300,6 T330,6 T360,6 T390,6 T420,6 T450,6 T480,6 T510,6 T540,6 T570,6 T600,6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <h1
            className="display-heading"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: "16px" }}
          >
            We&rsquo;ll be in touch.
          </h1>
          <p style={{ fontSize: "17px", lineHeight: 1.65, color: "var(--clay-700)" }}>
            Thanks for reaching out. We read every message and will write back within a day.
          </p>
          <CheckCircle
            aria-hidden="true"
            style={{
              width: "40px",
              height: "40px",
              color: "var(--sage-700)",
              margin: "32px auto 0",
              display: "block",
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        paddingTop: "88px",
      }}
    >
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
                { label: "Email", value: "hello@sitehaus.dev" },
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

        {/* Right — form card, full height */}
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--line-soft)",
            borderRadius: "14px",
            padding: "36px",
            boxShadow: "var(--shadow-xs)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <form
            action={formAction}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <Field
                id="name"
                label="Name"
                name="name"
                placeholder="Your name"
                required
                disabled={isPending}
              />
              <Field
                id="email"
                label="Email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                disabled={isPending}
              />
            </div>

            <Field
              id="company"
              label="Company"
              name="company"
              placeholder="Optional"
              disabled={isPending}
            />

            <FieldArea
              id="message"
              label="Message"
              name="message"
              placeholder="Tell us what you're trying to build..."
              required
              disabled={isPending}
            />

            {state && "error" in state && (
              <p
                role="alert"
                aria-live="assertive"
                style={{ fontSize: "13px", color: "var(--destructive)", margin: 0 }}
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                alignSelf: "flex-start",
                fontFamily: "var(--font-body)",
                fontSize: "15px",
                fontWeight: 500,
                padding: "11px 22px",
                borderRadius: "999px",
                border: "none",
                background: isPending ? "var(--terracotta-300)" : "var(--terracotta-500)",
                color: "var(--parchment-50)",
                cursor: isPending ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              {isPending ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    style={{ width: "15px", height: "15px", animation: "spin 1s linear infinite" }}
                  />
                  Sending…
                </>
              ) : (
                "Send it →"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  name,
  type = "text",
  placeholder,
  required,
  disabled,
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--clay-700)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--ink-300)", fontWeight: 400, marginLeft: "4px" }}>*</span>
        )}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="contact-field"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "15px",
          padding: "11px 14px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
          background: "var(--bg-raised)",
          color: "var(--ink-900)",
          outline: "none",
          width: "100%",
        }}
      />
    </label>
  );
}

function FieldArea({
  id,
  label,
  name,
  placeholder,
  required,
  disabled,
}: {
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--clay-700)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--ink-300)", fontWeight: 400, marginLeft: "4px" }}>*</span>
        )}
      </span>
      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="contact-field"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "15px",
          padding: "11px 14px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
          background: "var(--bg-raised)",
          color: "var(--ink-900)",
          outline: "none",
          width: "100%",
          resize: "vertical",
          minHeight: "160px",
        }}
      />
    </label>
  );
}
