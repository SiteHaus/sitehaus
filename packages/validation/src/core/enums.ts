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
  "active",
  "paused",
  "submitted",
  "reviewing",
  "archived",
] as const;

export const projectBillingStatusValues = [
  "paid",
  "outstanding",
  "pending",
  "late",
] as const;

export const userStatusValues = ["active", "suspended"] as const;

export const otpPurposeValues = [
  "email_verification",
  "password_reset",
  "invite",
] as const;

export const clientTypeValues = ["public", "confidential"] as const;

export const codeChallengeMethodValues = ["S256"] as const;
