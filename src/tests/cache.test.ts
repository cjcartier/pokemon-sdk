import { describe, it, expect } from 'vitest';
import { LruCache } from '../core/cache';

describe('LruCache', () => {
  it('updates existing key (covers has(key) delete branch)', () => {
    const c = new LruCache<number>(5);

    c.set('x', 1);
    c.set('x', 2); // triggers: if (has) delete -> set
    expect(c.get('x')).toBe(2);
  });

  it('evicts least recently used after a bump', () => {
    const c = new LruCache<string>(2);

    c.set('a', 'A');
    c.set('b', 'B');
    // bump 'a' to most-recent
    expect(c.get('a')).toBe('A');
    // add 'c' -> should evict LRU ('b')
    c.set('c', 'C');
    expect(c.get('b')).toBeUndefined(); // eviction happened (covers size>max block)
    expect(c.get('a')).toBe('A');
    expect(c.get('c')).toBe('C');
  });

  it('evicts first-in when no access occurs', () => {
    const c = new LruCache<number>(2);

    c.set('k1', 1);
    c.set('k2', 2);
    c.set('k3', 3); // exceeds capacity -> evict k1
    expect(c.get('k1')).toBeUndefined(); // eviction branch executed again
    expect(c.get('k2')).toBe(2);
    expect(c.get('k3')).toBe(3);
  });
});
