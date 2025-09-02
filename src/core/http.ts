import { HTTPError, NetworkError } from './errors';
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS, DEFAULT_RETRY_ATTEMPTS, DEFAULT_BACKOFF_MS, SDK_HEADER } from './config';

import { toUrl, isRetryableStatus, bodySnippet, nextDelayMs, withTimeout } from './utils';
import type { FetchLike, RequestOptions, TransportOptions } from './types';

/** ===== Transport =====
 * - baseUrl + default headers
 * - timeout via AbortController
 * - retries on 429/5xx/timeout (AbortError)
 * - typed errors (HTTPError vs NetworkError)
 */
export class Transport {
  readonly baseUrl: string;
  private headers: Record<string, string>;
  private timeoutMs: number;
  private attempts: number;
  private backoffMs: number;
  private fetchImpl: FetchLike;

  constructor(opts: TransportOptions = {}) {
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    this.headers = { 'X-SDK': SDK_HEADER, ...(opts.headers ?? {}) };
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.attempts = Math.max(1, opts.retry?.attempts ?? DEFAULT_RETRY_ATTEMPTS);
    this.backoffMs = opts.retry?.backoffMs ?? DEFAULT_BACKOFF_MS;
    this.fetchImpl = opts.fetch ?? (globalThis.fetch as FetchLike);

    if (!this.fetchImpl) throw new Error('A fetch implementation is required');
  }

  async get<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = toUrl(this.baseUrl, path),
      headers = { ...this.headers, ...(opts.headers ?? {}) };

    let attempt = 0,
      lastErr: unknown;

    while (attempt < this.attempts) {
      const { signal, cleanup } = withTimeout(this.timeoutMs, opts.signal);

      try {
        const res = await this.fetchImpl(url, { method: 'GET', headers, signal });

        if (!res.ok) {
          const snippet = await bodySnippet(res),
            httpErr = new HTTPError(res.status, url, 'GET', snippet);

          if (isRetryableStatus(res.status) && attempt + 1 < this.attempts) {
            attempt++;
            await new Promise(r => setTimeout(r, nextDelayMs(attempt, this.backoffMs, res)));
            continue;
          }

          throw httpErr;
        }

        return (await res.json()) as T;
      } catch (err: unknown) {
        lastErr = err;

        const isAbortError = (err as any)?.name === 'AbortError',
          isHttpError = err instanceof HTTPError;

        const canRetry = (isAbortError || !isHttpError) && attempt + 1 < this.attempts;
        if (!canRetry) {
          if (isHttpError) throw err;
          throw new NetworkError(err);
        }

        attempt++;
        await new Promise(r => setTimeout(r, nextDelayMs(attempt, this.backoffMs)));
      } finally {
        cleanup();
      }
    }

    throw new NetworkError(lastErr);
  }
}
