import { Transport } from './core/http';
import { CacheLike } from './core/cache';
import type { ListParams, Paginated, RequestOptions } from './core/types';
import { type Generation, GenerationSchema, maybeValidate, NamedAPIResource } from './core/validation';

export class GenerationAPI {
  constructor(private transport: Transport, private cache?: CacheLike<Generation>, private validate = false) {}

  async getGeneration(
    idOrName: string | number,
    opts: RequestOptions & { validate?: boolean } = {},
  ): Promise<Generation> {
    const key = `generation:${idOrName}`,
      cached = this.cache?.get(key);

    if (cached) return cached;

    const raw: unknown = await this.transport.get(`/generation/${idOrName}/`, opts),
      data = maybeValidate(GenerationSchema, raw, opts.validate ?? this.validate);

    this.cache?.set(key, data);

    return data;
  }

  async listGenerations(params: ListParams = {}, opts: RequestOptions = {}): Promise<Paginated<NamedAPIResource>> {
    const { limit = 20, offset = 0 } = params;

    return this.transport.get<Paginated<NamedAPIResource>>(`/generation?limit=${limit}&offset=${offset}`, opts);
  }

  async *iterateGenerations(
    params: { pageSize?: number } = {},
    opts: RequestOptions = {},
  ): AsyncGenerator<NamedAPIResource, void, unknown> {
    let next: string | null = `/generation?limit=${params.pageSize ?? 50}&offset=0`;

    while (next) {
      const page: Paginated<NamedAPIResource> = await this.transport.get<Paginated<NamedAPIResource>>(next, opts);

      for (const item of page.results) yield item;

      next = page.next;
    }
  }
}
