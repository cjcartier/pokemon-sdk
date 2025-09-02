# PokeAPI TypeScript SDK

A TypeScript SDK for the PokeAPI v2 built as a take-home project for Speakeasy AI. This SDK provides a type-safe,
developer-friendly interface for accessing Pokémon data with features like retries, caching, response validation, and
integration testing.

## Features

- _TypeScript first_ – full type safety with Zod validation support.
- _Transport layer_ – timeout, retries with backoff + jitter, typed error classes.
- _LRU caching_ – in-memory, pluggable, with optional TTL.
- _Pagination helpers_ – iterate across paginated Pokémon results.
- _Optional runtime validation_ – Zod schemas ensure responses match the contract.
- _Tested with Vitest + MSW_ – both unit tests and live “smoke” tests against PokeAPI.

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/cjcartier/pokemon-sdk.git
cd pokeapi-sdk
yarn install
```

## Usage Create a client import { PokeClient } from "pokeapi-sdk";

```ts
const client = new PokeClient({ validateResponses: true, // enable Zod validation });

// Get a single Pokémon by name or id
const pikachu = await client.pokemon.getPokemon("pikachu");
console.log(pikachu.name); // "pikachu"

// List paginated Pokémon
const page = await client.pokemon.listPokemon({ limit: 5, offset: 0 });
console.log(page.results.map(p => p.name));

// Iterate across all Pokémon lazily
for await (const p of client.pokemon.iteratePokemon({ pageSize: 100 })) {
  console.log(p.name);
}

// Get a generation
const gen1 = await client.generation.getGeneration(1); console.log(gen1.name);
```

## Testing

Unit tests and integration tests are included.

Run the full test suite with coverage:

```bash
yarn test:coverage
```

Run only live smoke tests (queries the real PokeAPI):

```bash
yarn test:live
```

Coverage reports are written to coverage/.

## Design Decisions

1. Transport Layer (`Transport`)

- Handles base URL, headers, retries, timeouts, and typed error handling (`HTTPError`, `NetworkError`).
- Retries use exponential backoff + jitter (`nextDelayMs`).
- Abstracted so it can accept any `fetch` implementation (Node, browser, MSW for tests).

2. Response Validation with Zod

- Optional, opt-in validation (`validateResponses: true`).
- Provides runtime safety when consuming the PokeAPI.
- Errors are wrapped in a `ValidationError` that includes the failing issues.

3. Caching

- Implemented as a lightweight LRU cache.
- Prevents repeated network calls for the same Pokémon or generation.
- Pluggable via `ClientOptions.cache`.

4. Pagination

- Both `listPokemon` (page-by-page) and `iteratePokemon` (async generator across all pages) are supported.
- Mirrors real-world SDKs where consumers might want either model.

5. Testing Approach

- Unit tests cover utils, caching, validation, and transport error cases.
- MSW (Mock Service Worker) used to simulate PokeAPI responses reliably.
- Smoke tests (`yarn test:live`) ensure the SDK actually works against the real PokeAPI.

6. Tooling

- Yarn for dependency management.
- Vitest for fast, modern testing.
- Zod for schema validation.
- MSW for API mocking in tests.

7. Abstractions / Amalgamated Calls

Beyond 1:1 endpoint bindings, the SDK includes:

- `client.getPokemonWithGeneration(idOrName)` — fetches a Pokémon, follows its species to determine the generation, and
  returns both objects together.
- `pokemon.iteratePokemon({ pageSize })` — an async generator that streams results across paginated pages.

These improve developer ergonomics compared to raw API usage.

## Project Structure

```bash
src/
  core/              # transport, cache, validation, utils
  pokemon.ts         # PokemonAPI client
  generation.ts      # GenerationAPI client
  index.ts           # exports PokeClient
tests/               # unit + integration tests
```

## Future Improvements

- Add more PokeAPI endpoints (moves, abilities, items, etc.).
- Support query filtering (by type, habitat, etc.).
- Persisted cache adapters (Redis, localStorage).
- Full CI/CD pipeline with automated publish to npm.
