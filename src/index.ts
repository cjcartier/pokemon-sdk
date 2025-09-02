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

  async getPokemonWithGeneration(idOrName: string | number) {
    const pokemon = await this.pokemon.getPokemon(idOrName),
      speciesUrl = pokemon.species?.url;
    if (!speciesUrl) return { pokemon, generation: undefined };

    const species = await this.transport.get<{ generation?: { url?: string } }>(speciesUrl),
      genUrl = species.generation?.url,
      genIdOrName = genUrl?.split('/').filter(Boolean).pop(),
      generation = genIdOrName ? await this.generation.getGeneration(genIdOrName) : undefined;

    return { pokemon, generation };
  }
}

export type { Pokemon, Generation, Paginated, NamedAPIResource };
