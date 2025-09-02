import { Transport } from './core/http';
import { CacheLike, LruCache } from './core/cache';
import { PokemonAPI } from './pokemon';
import { GenerationAPI } from './generation';

import type { Paginated, TransportOptions } from './core/types';
import type { Pokemon, Generation, NamedAPIResource } from './core/validation';

export interface ClientOptions extends TransportOptions {
  caches?: {
    pokemon?: CacheLike<Pokemon>;
    generation?: CacheLike<Generation>;
  };
  validateResponses?: boolean;
}

export class PokeClient {
  private transport: Transport;
  private validate: boolean;

  pokemon: PokemonAPI;
  generation: GenerationAPI;

  constructor(opts: ClientOptions = {}) {
    const fallback = new LruCache<any>(300);

    this.transport = new Transport(opts);
    this.validate = opts.validateResponses ?? false;

    this.pokemon = new PokemonAPI(
      this.transport,
      opts.caches?.pokemon ?? (fallback as CacheLike<Pokemon>),
      this.validate,
    );
    this.generation = new GenerationAPI(
      this.transport,
      opts.caches?.generation ?? (fallback as CacheLike<Generation>),
      this.validate,
    );
  }
}

export type { Pokemon, Generation, Paginated, NamedAPIResource };
