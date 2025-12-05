let refreshPromise: Promise<void> | null = null;

export const runSingleRefresh = (fn: () => Promise<void>) => {
  if (!refreshPromise) {
    refreshPromise = fn().finally(() => (refreshPromise = null));
  }
  return refreshPromise;
};
