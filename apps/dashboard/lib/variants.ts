type BadgeVariant = "success" | "warning" | "destructive" | "secondary" | "outline";

export function statusVariant(s: string): BadgeVariant {
  switch (s) {
    case "launched":
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

export function billingVariant(s: string | null): BadgeVariant {
  switch (s) {
    case "paid":
      return "success";
    case "late":
      return "destructive";
    case "outstanding":
      return "warning";
    default:
      return "secondary";
  }
}

export function ticketStatusVariant(s: string): BadgeVariant {
  switch (s) {
    case "resolved":
    case "closed":
      return "success";
    case "in_progress":
      return "warning";
    case "open":
      return "secondary";
    default:
      return "secondary";
  }
}

export function priorityVariant(s: string): BadgeVariant {
  switch (s) {
    case "urgent":
      return "destructive";
    case "high":
      return "warning";
    default:
      return "secondary";
  }
}
