import type { MilestoneItem } from "@site-haus/contracts";
import { Badge } from "@site-haus/ui/components/base/badge";

const statusVariant = (
  s: MilestoneItem["status"]
): "success" | "warning" | "secondary" => {
  switch (s) {
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    default:
      return "secondary";
  }
};

const statusLabel = (s: MilestoneItem["status"]) => {
  switch (s) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
  }
};

export function MilestoneStatusBadge({
  status,
}: {
  status: MilestoneItem["status"];
}) {
  return (
    <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
  );
}
