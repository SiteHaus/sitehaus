let refreshPromise: Promise<void> | null = null;

const runLocally = (fn: () => Promise<void>) => {
  if (!refreshPromise) {
    refreshPromise = fn().finally(() => (refreshPromise = null));
  }
  return refreshPromise;
};

// The refresh cookie is shared across every tab on the origin, but this
// module's `refreshPromise` singleton only dedupes calls within one tab. Two
// tabs refreshing at once (e.g. both waking up to a burst of 401s right after
// a deploy) would otherwise both redeem the same token — the loser trips
// server-side reuse detection and the whole account gets logged out. Web
// Locks coordinates across tabs/workers on the same origin for free: whoever
// gets the lock refreshes, the rest wait, then proceed with the (now current)
// cookie already updated by the winner.
const hasWebLocks = typeof navigator !== "undefined" && "locks" in navigator;

export const runSingleRefresh = (fn: () => Promise<void>) => {
  if (!hasWebLocks) return runLocally(fn);
  return navigator.locks.request("sh-refresh", () => runLocally(fn));
};
