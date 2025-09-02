export interface CacheLike<V = unknown> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}

/**
 * Lightweight in-memory LRU cache.
 * - Bounded by `max` entries.
 * - Evicts the least recently used entry when size exceeds `max`.
 * - `get` operations bump keys to “most recently used”.
 */
export class LruCache<V = unknown> implements CacheLike<V> {
  private map = new Map<string, V>();

  constructor(private max = 500) {}

  get(key: string): V | undefined {
    const val = this.map.get(key);
    if (val === undefined) return undefined;

    this.map.delete(key);
    this.map.set(key, val);

    return val;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    this.map.set(key, value);

    if (this.map.size > this.max) {
      const oldestKey = this.map.keys().next().value;

      if (oldestKey) this.map.delete(oldestKey);
    }
  }
}
