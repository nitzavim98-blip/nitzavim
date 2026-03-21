import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let _limiter: Ratelimit | null = null

function getLimiter(): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null
  }
  if (!_limiter) {
    _limiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'registration',
    })
  }
  return _limiter
}

export async function checkRateLimit(ip: string): Promise<{ success: boolean }> {
  const limiter = getLimiter()
  if (!limiter) return { success: true }
  return limiter.limit(ip)
}
