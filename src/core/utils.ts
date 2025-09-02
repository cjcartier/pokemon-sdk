/** Limit for error body preview (exported for tests) */
export const BODY_SNIPPET_LIMIT = 200;
/** Jitter cap for backoff (exported for tests) */
export const MAX_JITTER_MS = 100;

/**
 * Small sleep helper (useful for retry backoff)
 *
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the given number of milliseconds
 */
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Returns true for fully-qualified http(s) URLs.
 *
 */
export const isAbsoluteUrl = (path: string): boolean => path.startsWith('http://') || path.startsWith('https://');

/** Joins baseUrl + path unless path is already absolute. */
export const toUrl = (baseUrl: string, path: string): string => (isAbsoluteUrl(path) ? path : `${baseUrl}${path}`);

/** Retry policy: 429 or any 5xx is considered retryable. */
export const isRetryableStatus = (status: number): boolean => status === 429 || (status >= 500 && status <= 599);

/** Read a short snippet of the response body (safe even if stream fails). */
export const bodySnippet = async (res: Response, limit = BODY_SNIPPET_LIMIT): Promise<string | undefined> => {
  try {
    const text = await res.text();

    return text.slice(0, limit);
  } catch {
    return undefined;
  }
};

/**
 * Compute delay for the next retry attempt.
 * - Prefer `Retry-After` header (seconds or HTTP-date) when present and valid.
 * - Otherwise use baseBackoffMs * attempt + jitter.
 */
export const nextDelayMs = (attempt: number, baseBackoffMs: number, res?: Response): number => {
  const header = res?.headers.get('retry-after') ?? res?.headers.get('Retry-After');

  if (header) {
    const secs = Number(header);
    if (!Number.isNaN(secs) && secs >= 0) return secs * 1000;

    const target = Date.parse(header);
    if (!Number.isNaN(target)) {
      const diff = target - Date.now();
      if (diff > 0) return diff;
    }
  }

  const jitter = Math.random() * MAX_JITTER_MS;

  return baseBackoffMs * attempt + jitter;
};

/**
 * Create an AbortController that auto-aborts after `timeoutMs`,
 * and mirrors cancellation from an optional parent signal.
 *
 * Returns the effective `signal` and a `cleanup()` you must call in `finally`.
 */
export const withTimeout = (
  timeoutMs: number,
  parent?: AbortSignal,
): {
  signal: AbortSignal;
  cleanup: () => void;
} => {
  const ctrl = new AbortController();

  const onParentAbort = () => ctrl.abort(parent?.reason);
  if (parent) parent.addEventListener('abort', onParentAbort, { once: true });

  const timer = setTimeout(() => {
    ctrl.abort(new DOMException('TimeoutError', 'AbortError'));
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener('abort', onParentAbort);
  };

  return { signal: ctrl.signal, cleanup };
};
