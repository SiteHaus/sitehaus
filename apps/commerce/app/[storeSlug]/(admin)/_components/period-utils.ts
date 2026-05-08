export type PeriodOption = "7d" | "30d" | "90d" | "12m";

export function periodToParams(period: PeriodOption): {
  from: string;
  to: string;
  granularity: "day" | "week" | "month";
} {
  const to = new Date();
  const from = new Date();

  if (period === "7d") {
    from.setDate(from.getDate() - 7);
    return { from: isoDate(from), to: isoDate(to), granularity: "day" };
  } else if (period === "30d") {
    from.setDate(from.getDate() - 30);
    return { from: isoDate(from), to: isoDate(to), granularity: "week" };
  } else if (period === "90d") {
    from.setDate(from.getDate() - 90);
    return { from: isoDate(from), to: isoDate(to), granularity: "month" };
  } else {
    from.setFullYear(from.getFullYear() - 1);
    return { from: isoDate(from), to: isoDate(to), granularity: "month" };
  }
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0]!;
}
