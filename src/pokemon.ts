import { Transport } from './core/http';
import { CacheLike } from './core/cache';
import { ListParams, Paginated, RequestOptions } from './core/types';
import { NamedAPIResource, type Pokemon, PokemonSchema, maybeValidate } from './core/validation';

export class PokemonAPI {
  constructor(private transport: Transport, private cache?: CacheLike<Pokemon>, private validate = false) {}

  async getPokemon(idOrName: string | number, opts: RequestOptions & { validate?: boolean } = {}): Promise<Pokemon> {
    const key = `pokemon:${idOrName}`,
      cached = this.cache?.get(key) as Pokemon | undefined;

    if (cached) return cached;

    const raw = await this.transport.get<Pokemon>(`/pokemon/${idOrName}/`, opts),
      data = maybeValidate(PokemonSchema, raw, opts.validate ?? this.validate);

    this.cache?.set(key, data);

    return data;
  }

  async listPokemon(params: ListParams = {}, opts: RequestOptions = {}): Promise<Paginated<NamedAPIResource>> {
    const { limit = 20, offset = 0 } = params;

    return this.transport.get<Paginated<NamedAPIResource>>(`/pokemon?limit=${limit}&offset=${offset}`, opts);
  }

  async *iteratePokemon(
    params: { pageSize?: number } = {},
    opts: RequestOptions = {},
  ): AsyncGenerator<NamedAPIResource> {
    let next: string | null = `/pokemon?limit=${params.pageSize ?? 50}&offset=0`;

    while (next) {
      const page: Paginated<NamedAPIResource> = await this.transport.get<Paginated<NamedAPIResource>>(next, opts);

      for (const item of page.results) {
        yield item;
      }

      next = page.next;
    }
  }
}
