export const projectTypeValues = [
  "ecommerce",
  "saas",
  "portfolio",
  "marketing",
  "landing_page",
  "blog",
  "internal_tool",
  "web_app",
  "rebuild",
  "maintenance",
  "other",
] as const;

export const projectStatusValues = [
  "submitted",
  "in_progress",
  "launched",
  "completed",
  "cancelled",
] as const;

export const projectBillingStatusValues = ["paid", "outstanding", "pending", "late"] as const;

export const userStatusValues = ["active", "suspended", "deleted"] as const;

export const otpPurposeValues = [
  "email_verification",
  "password_reset",
  "invite",
  "login",
  "email_change",
] as const;

export const clientTypeValues = ["public", "confidential"] as const;

export const codeChallengeMethodValues = ["S256"] as const;

// ── Dashboard enums ──────────────────────────────────────────────────

export const designDocumentStatusValues = ["draft", "in_review", "approved", "amended"] as const;

export const milestoneStatusValues = ["not_started", "in_progress", "completed"] as const;

export const ticketTypeValues = ["request", "bug", "question"] as const;

export const ticketPriorityValues = ["low", "normal", "high", "urgent"] as const;

export const ticketStatusValues = ["open", "in_progress", "resolved", "closed"] as const;

export const assetReviewStatusValues = [
  "pending",
  "reviewed",
  "approved",
  "needs_replacement",
] as const;

export const commentTargetTypeValues = ["ticket", "design_document", "project"] as const;

export const billingRecordTypeValues = ["recurring", "one_time"] as const;

export const billingRecordStatusValues = [
  "active",
  "past_due",
  "cancelled",
  "paid",
  "refunded",
] as const;
