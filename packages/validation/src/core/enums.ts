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

export const userRolesValues = ["client", "admin", "staff"] as const;
