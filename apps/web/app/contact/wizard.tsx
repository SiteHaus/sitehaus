"use client";

import { useTransition, useState } from "react";
import { Progress } from "@site-haus/ui/components/base/progress";
import { Button } from "@site-haus/ui/components/base/button";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { ArrowLeft, CheckCircle, Loader2, MoveRight } from "lucide-react";
import { submitContact } from "./actions";

const STEPS = [
  { id: "what", question: "What are you building?" },
  { id: "stage", question: "Where are you at?" },
  { id: "timeline", question: "When do you need this live?" },
  { id: "details", question: "Tell us more." },
  { id: "contact", question: "How do we reach you?" },
] as const;

const WHAT_OPTIONS = [
  "Web app or website",
  "Mobile app",
  "Desktop software",
  "Need something rebuilt",
  "Not sure yet",
];

const STAGE_OPTIONS = [
  "Just an idea",
  "Have a rough spec",
  "My current solution isn't working",
  "Ready to start",
];

const TIMELINE_OPTIONS = [
  "Yesterday (it's urgent)",
  "Within the next 3 months",
  "3–6 months from now",
  "No hard deadline",
];

type Answers = {
  what: string[];
  stage: string;
  timeline: string;
  details: string;
  name: string;
  email: string;
};

function Choice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "13px 16px",
        borderRadius: "10px",
        border: `1.5px solid ${selected ? "var(--terracotta-500)" : "var(--line)"}`,
        background: selected ? "var(--terracotta-500)" : "transparent",
        color: selected ? "var(--parchment-50)" : "var(--clay-700)",
        fontFamily: "var(--font-body)",
        fontSize: "14.5px",
        fontWeight: 500,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.12s ease, background 0.12s ease, color 0.12s ease",
        lineHeight: 1.3,
      }}
    >
      {label}
    </button>
  );
}

function Recap({ answers, step }: { answers: Answers; step: number }) {
  const parts: string[] = [];
  if (step > 0 && answers.what.length) parts.push(answers.what.join(", "));
  if (step > 1 && answers.stage) parts.push(answers.stage);
  if (step > 2 && answers.timeline) parts.push(answers.timeline);
  if (!parts.length) return null;
  return (
    <p
      style={{
        fontSize: "11px",
        color: "var(--clay-400)",
        marginTop: "auto",
        paddingTop: "16px",
        letterSpacing: "0.01em",
        lineHeight: 1.5,
      }}
    >
      {parts.join(" · ")}
    </p>
  );
}

export function ProjectWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    what: [],
    stage: "",
    timeline: "",
    details: "",
    name: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  const toggleWhat = (option: string) => {
    setAnswers((a) => ({
      ...a,
      what: a.what.includes(option) ? a.what.filter((v) => v !== option) : [...a.what, option],
    }));
  };

  const selectStage = (stage: string) => {
    setAnswers((a) => ({ ...a, stage }));
    setTimeout(() => setStep(2), 180);
  };

  const selectTimeline = (timeline: string) => {
    setAnswers((a) => ({ ...a, timeline }));
    setTimeout(() => setStep(3), 180);
  };

  const handleSubmit = () => {
    setError(null);
    if (!answers.name.trim() || !answers.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!answers.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const messageParts = [
      answers.what.length ? `What: ${answers.what.join(", ")}` : null,
      answers.stage ? `Stage: ${answers.stage}` : null,
      answers.timeline ? `Timeline: ${answers.timeline}` : null,
      answers.details.trim() ? `\nDetails:\n${answers.details.trim()}` : null,
    ].filter(Boolean);

    const fd = new FormData();
    fd.append("name", answers.name.trim());
    fd.append("email", answers.email.trim());
    fd.append("message", messageParts.join("\n"));

    startTransition(async () => {
      const result = await submitContact(null, fd);
      if (result && "success" in result) {
        setSubmitted(true);
      } else if (result && "error" in result) {
        setError(result.error);
      }
    });
  };

  if (submitted) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px 16px",
          flex: 1,
        }}
      >
        <svg
          width="72"
          height="9"
          viewBox="0 0 600 12"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ display: "block", margin: "0 auto 20px", color: "var(--terracotta-500)" }}
        >
          <path
            d="M0,6 Q15,0 30,6 T60,6 T90,6 T120,6 T150,6 T180,6 T210,6 T240,6 T270,6 T300,6 T330,6 T360,6 T390,6 T420,6 T450,6 T480,6 T510,6 T540,6 T570,6 T600,6"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <p
          className="display-heading"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: "12px" }}
        >
          We&rsquo;ll be in touch.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.65, color: "var(--clay-700)" }}>
          Thanks for reaching out. We read every message and write back within a day.
        </p>
        <CheckCircle
          aria-hidden="true"
          style={{
            width: "36px",
            height: "36px",
            color: "var(--sage-700, #5a7a5a)",
            margin: "28px auto 0",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .wizard-step { animation: stepIn 0.22s ease forwards; }
      `}</style>

      {/* Progress + back */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--clay-500)",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
            aria-label="Go back"
          >
            <ArrowLeft style={{ width: "15px", height: "15px" }} />
          </button>
        ) : (
          <div style={{ width: "23px", flexShrink: 0 }} />
        )}
        <Progress value={progress} className="h-1.5 flex-1" />
        <span
          style={{
            fontSize: "11px",
            color: "var(--clay-400)",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {step + 1} / {STEPS.length}
        </span>
      </div>

      {/* Step content */}
      <div
        key={step}
        className="wizard-step"
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: "'opsz' 36, 'SOFT' 60, 'WONK' 1",
            fontSize: "clamp(20px, 2.8vw, 26px)",
            fontWeight: 500,
            color: "var(--ink-900)",
            marginBottom: "20px",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {STEPS[step]?.question}
        </p>

        {/* Step 1 — multi-select what */}
        {step === 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {WHAT_OPTIONS.map((opt) => (
                <Choice
                  key={opt}
                  label={opt}
                  selected={answers.what.includes(opt)}
                  onClick={() => toggleWhat(opt)}
                />
              ))}
            </div>
            <Recap answers={answers} step={step} />
            <Button
              onClick={() => setStep(1)}
              disabled={answers.what.length === 0}
              className="mt-5 self-start"
              style={{ borderRadius: "999px" }}
            >
              Continue <MoveRight className="ml-1.5 h-4 w-4" />
            </Button>
          </>
        )}

        {/* Step 2 — single-select stage (auto-advance) */}
        {step === 1 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {STAGE_OPTIONS.map((opt) => (
                <Choice
                  key={opt}
                  label={opt}
                  selected={answers.stage === opt}
                  onClick={() => selectStage(opt)}
                />
              ))}
            </div>
            <Recap answers={answers} step={step} />
          </>
        )}

        {/* Step 3 — single-select timeline (auto-advance) */}
        {step === 2 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {TIMELINE_OPTIONS.map((opt) => (
                <Choice
                  key={opt}
                  label={opt}
                  selected={answers.timeline === opt}
                  onClick={() => selectTimeline(opt)}
                />
              ))}
            </div>
            <Recap answers={answers} step={step} />
          </>
        )}

        {/* Step 4 — details textarea */}
        {step === 3 && (
          <>
            <Textarea
              value={answers.details}
              onChange={(e) => setAnswers((a) => ({ ...a, details: e.target.value }))}
              placeholder="Give us the overview — what problem are you solving, who's it for, any constraints we should know about. Even a rough idea is fine."
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "14.5px",
                minHeight: "148px",
                resize: "vertical",
                border: "1.5px solid var(--line)",
                background: "transparent",
                color: "var(--ink-900)",
                borderRadius: "10px",
                padding: "12px 14px",
              }}
            />
            <Recap answers={answers} step={step} />
            <Button
              onClick={() => setStep(4)}
              className="mt-5 self-start"
              style={{ borderRadius: "999px" }}
            >
              Continue <MoveRight className="ml-1.5 h-4 w-4" />
            </Button>
          </>
        )}

        {/* Step 5 — contact info */}
        {step === 4 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Label
                  htmlFor="wiz-name"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--clay-700)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Name
                </Label>
                <Input
                  id="wiz-name"
                  value={answers.name}
                  onChange={(e) => setAnswers((a) => ({ ...a, name: e.target.value }))}
                  placeholder="Your name"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14.5px",
                    border: "1.5px solid var(--line)",
                    background: "transparent",
                    color: "var(--ink-900)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    height: "auto",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Label
                  htmlFor="wiz-email"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--clay-700)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Email
                </Label>
                <Input
                  id="wiz-email"
                  type="email"
                  value={answers.email}
                  onChange={(e) => setAnswers((a) => ({ ...a, email: e.target.value }))}
                  placeholder="you@company.com"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14.5px",
                    border: "1.5px solid var(--line)",
                    background: "transparent",
                    color: "var(--ink-900)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    height: "auto",
                  }}
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                style={{ fontSize: "13px", color: "var(--destructive)", marginTop: "8px" }}
              >
                {error}
              </p>
            )}

            <Recap answers={answers} step={step} />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                marginTop: "20px",
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
          </>
        )}
      </div>
    </>
  );
}
