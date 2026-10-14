/*
 * This file defines the rate limit module.
 */

// Rate limiter instances for API and auth routes
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLocalLimiter } from './local-rate-limit';

interface Limiter {
  limit(identifier: string): Promise<{ success: boolean; reset: number }>;
}

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost').hostname;
const isLocalDatabase = ['localhost', '127.0.0.1', '[::1]'].includes(supabaseHost);
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
// Shared limits need Upstash; without it each server instance keeps its own counts.
const redis = process.env.NODE_ENV === 'production' && !isLocalDatabase && redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Lets requests through if Upstash cannot be reached, so an outage there never blocks sign-in or the API.
function failOpen(limiter: Limiter): Limiter {
  return {
    async limit(identifier: string) {
      try {
        return await limiter.limit(identifier);
      } catch {
        return { success: true, reset: Date.now() };
      }
    },
  };
}

// Builds a limiter backed by Upstash when configured, otherwise in memory.
function createLimiter(maxRequests: number, window: `${number} ${'m' | 'h'}`, windowMs: number, prefix: string): Limiter {
  if (!redis) return createLocalLimiter(maxRequests, windowMs);
  return failOpen(new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    prefix,
    analytics: false,
  }));
}

// General API mutations — 60 requests per minute per user
export const apiLimiter = createLimiter(60, '1 m', 60_000, 'rl:api');

// Auth routes — 10 attempts per 15 minutes per IP
export const authLimiter = createLimiter(10, '15 m', 15 * 60_000, 'rl:auth');

// Report submissions — 5 per hour per user (anti-spam)
export const reportLimiter = createLimiter(5, '1 h', 60 * 60_000, 'rl:report');
