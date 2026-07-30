type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Limpieza periódica para que el Map no crezca indefinidamente en un
// proceso de larga duración. `unref()` evita que este timer mantenga
// vivo el proceso (relevante en serverless/edge donde no aplica igual,
// pero no hace daño y ayuda en dev/local).
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

/**
 * Rate limiter simple en memoria (ventana fija). Suficiente para un solo
 * proceso; en un despliegue multi-instancia cada instancia tiene su propio
 * conteo, así que el límite real efectivo puede ser más alto que `limit`.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}
