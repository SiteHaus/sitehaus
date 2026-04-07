import * as React from "react";
import NotificationEmail from "../emails/NotificationEmail.js";
import { renderHtml, renderText } from "./index.js";

async function render(node: React.ReactElement) {
  const [html, text] = await Promise.all([renderHtml(node), renderText(node)]);
  return { html, text };
}

// ─── Milestone: completed (notify client to sign off) ────────────────────────

export type MilestoneCompletedEmailProps = {
  milestoneName: string;
  projectName: string;
  ctaUrl: string;
};

export async function renderMilestoneCompletedEmail(props: MilestoneCompletedEmailProps) {
  const subject = `Milestone ready for sign-off: ${props.milestoneName}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title="A milestone is ready for your sign-off"
      body={`A milestone on your project has been marked complete. Please review it and sign off when you're ready.`}
      context={[
        { label: "Project", value: props.projectName },
        { label: "Milestone", value: props.milestoneName },
      ]}
      ctaText="Review & sign off"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

// ─── Milestone: signed off (notify assigned employee) ────────────────────────

export type MilestoneSignedOffEmailProps = {
  milestoneName: string;
  projectName: string;
  signedOffByName: string;
  ctaUrl: string;
};

export async function renderMilestoneSignedOffEmail(props: MilestoneSignedOffEmailProps) {
  const subject = `Client signed off: ${props.milestoneName}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title="A client signed off on a milestone"
      body={`${props.signedOffByName} has signed off on a milestone for ${props.projectName}.`}
      context={[
        { label: "Project", value: props.projectName },
        { label: "Milestone", value: props.milestoneName },
        { label: "Signed off by", value: props.signedOffByName },
      ]}
      ctaText="View project"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

// ─── Milestone: created (notify client) ──────────────────────────────────────

export type MilestoneCreatedEmailProps = {
  milestoneName: string;
  projectName: string;
  ctaUrl: string;
};

export async function renderMilestoneCreatedEmail(props: MilestoneCreatedEmailProps) {
  const subject = `New milestone added: ${props.milestoneName}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title="A new milestone has been added to your project"
      body={`Your SiteHaus team has added a new milestone to ${props.projectName}.`}
      context={[
        { label: "Project", value: props.projectName },
        { label: "Milestone", value: props.milestoneName },
      ]}
      ctaText="View milestones"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

// ─── Comment: created (notify the other party) ───────────────────────────────

export type CommentCreatedEmailProps = {
  authorName: string;
  targetLabel: string; // e.g. "Project: Acme Website"
  bodyPreview: string; // first ~200 chars of comment
  ctaUrl: string;
};

export async function renderCommentCreatedEmail(props: CommentCreatedEmailProps) {
  const subject = `New comment from ${props.authorName}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`${props.authorName} left a comment`}
      body={props.bodyPreview}
      context={[{ label: "On", value: props.targetLabel }]}
      ctaText="View & reply"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

// ─── Billing: payment failed (notify client) ─────────────────────────────────

export type PaymentFailedEmailProps = {
  amountFormatted: string; // e.g. "$120.00"
  ctaUrl: string;
};

export async function renderPaymentFailedEmail(props: PaymentFailedEmailProps) {
  const subject = "Action required: payment failed";
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title="A payment on your account has failed"
      body={`A payment of ${props.amountFormatted} could not be processed. Please update your payment method to avoid any interruption to your service.`}
      ctaText="Update payment method"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}
