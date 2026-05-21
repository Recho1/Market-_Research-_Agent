// In-memory rate limiter — per IP and per email
// Limits: 5 attempts per 15 minutes, lockout after 10 failures

interface Attempt {
  count:     number;
  firstAt:   number;
  lockedAt?: number;
}

const store = new Map<string, Attempt>();

const WINDOW_MS    = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;               // max attempts per window
const LOCKOUT_MS   = 30 * 60 * 1000; // 30 minute lockout after 10 failures
const LOCK_AFTER   = 10;              // lock after this many total failures

function getKey(type: string, identifier: string): string {
  return `${type}:${identifier.toLowerCase().trim()}`;
}

export function checkRateLimit(
  type: string,
  identifier: string
): { allowed: boolean; error?: string; retryAfterMs?: number } {
  const key  = getKey(type, identifier);
  const now  = Date.now();
  const rec  = store.get(key);

  // No record yet — first attempt
  if (!rec) {
    store.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }

  // Check if account is locked out
  if (rec.lockedAt) {
    const elapsed = now - rec.lockedAt;
    if (elapsed < LOCKOUT_MS) {
      const remaining = LOCKOUT_MS - elapsed;
      return {
        allowed:      false,
        error:        `Account temporarily locked. Try again in ${Math.ceil(remaining / 60000)} minutes.`,
        retryAfterMs: remaining,
      };
    }
    // Lockout expired — reset
    store.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }

  // Check if outside the rate limit window — reset
  if (now - rec.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }

  // Within window — increment
  rec.count++;

  // Lock account after too many failures
  if (rec.count >= LOCK_AFTER) {
    rec.lockedAt = now;
    store.set(key, rec);
    return {
      allowed:      false,
      error:        "Too many failed attempts. Account locked for 30 minutes.",
      retryAfterMs: LOCKOUT_MS,
    };
  }

  // Exceeded rate limit window
  if (rec.count > MAX_ATTEMPTS) {
    const remaining = WINDOW_MS - (now - rec.firstAt);
    return {
      allowed:      false,
      error:        `Too many attempts. Try again in ${Math.ceil(remaining / 60000)} minutes.`,
      retryAfterMs: remaining,
    };
  }

  store.set(key, rec);
  return { allowed: true };
}

export function resetRateLimit(type: string, identifier: string): void {
  store.delete(getKey(type, identifier));
}

// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store.entries()) {
    const age = now - (rec.lockedAt || rec.firstAt);
    if (age > LOCKOUT_MS) store.delete(key);
  }
}, 30 * 60 * 1000);
