export const statusKeys = {
  all: ["status"] as const,
  board: () => [...statusKeys.all, "board"] as const,
  monitor: (monitorId: string) => [...statusKeys.all, "monitor", monitorId] as const,
};
