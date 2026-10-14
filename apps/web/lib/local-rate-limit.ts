// Local development uses process memory so it does not require a hosted Redis.
export function createLocalLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  return {
    async limit(identifier: string) {
      const now = Date.now();
      const active = (requests.get(identifier) ?? []).filter((time) => time > now - windowMs);
      const success = active.length < maxRequests;
      if (success) active.push(now);
      requests.set(identifier, active);
      if (requests.size > 1000) {
        for (const [key, times] of requests) {
          if ((times.at(-1) ?? 0) <= now - windowMs) requests.delete(key);
        }
      }
      return { success, reset: (active[0] ?? now) + windowMs };
    },
  };
}
