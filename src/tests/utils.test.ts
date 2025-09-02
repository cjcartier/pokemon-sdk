import { describe, it, expect, afterEach, vi } from 'vitest';
import { isAbsoluteUrl, isRetryableStatus, nextDelayMs, bodySnippet, MAX_JITTER_MS } from '../core/utils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('http-utils', () => {
  it('detects absolute vs relative URLs', () => {
    expect(isAbsoluteUrl('http://x')).toBe(true);
    expect(isAbsoluteUrl('https://x')).toBe(true);
    expect(isAbsoluteUrl('/path')).toBe(false);
  });

  it('marks retryable statuses', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
  });

  it('uses Retry-After header when present', () => {
    const res = new Response(null, { headers: { 'Retry-After': '2' } });

    expect(nextDelayMs(1, 300, res)).toBe(2000);
  });

  it('falls back to backoff + jitter', () => {
    const delay = nextDelayMs(1, 300);

    expect(delay).toBeGreaterThanOrEqual(300);
    expect(delay).toBeLessThan(400);
  });

  it('snips body text', async () => {
    const res = new Response('a'.repeat(500)),
      snippet = await bodySnippet(res, 50);

    expect(snippet?.length).toBe(50);
  });
});

describe('bodySnippet', () => {
  it('returns a slice of the body on success (sanity)', async () => {
    const res = new Response('abcdefghijklmnopqrstuvwxyz'),
      snip = await bodySnippet(res, 10);
    expect(snip).toBe('abcdefghij');
  });

  it('returns undefined when reading the body fails (covers catch)', async () => {
    const res = { text: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as Response,
      snip = await bodySnippet(res, 10);
    expect(snip).toBeUndefined();
    expect(res.text).toHaveBeenCalled();
  });
});

describe('nextDelayMs', () => {
  it('uses numeric Retry-After seconds when present', () => {
    const res = new Response('', { headers: { 'Retry-After': '2' } }),
      ms = nextDelayMs(5, 300, res);

    expect(ms).toBe(2000);
  });

  it('uses HTTP-date Retry-After when present (covers date branch)', () => {
    const fixed = 1_700_000_000_000,
      nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixed);

    const future = new Date(fixed + 2000).toUTCString(),
      res = new Response('', { headers: { 'Retry-After': future } });

    const ms = nextDelayMs(1, 300, res);
    expect(ms).toBe(2000);

    nowSpy.mockRestore();
  });

  it('falls back to base * attempt + jitter when no header', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ms = nextDelayMs(2, 300);

    expect(ms).toBe(2 * 300 + 0.5 * MAX_JITTER_MS);
  });
});
