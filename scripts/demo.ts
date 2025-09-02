import { PokeClient } from '../src';

async function main() {
  const client = new PokeClient({ validateResponses: true });

  console.log('Fetching Pikachu…');
  const pikachu = await client.pokemon.getPokemon('pikachu');
  console.log('Pikachu:', { id: pikachu.id, name: pikachu.name });

  console.log('\nListing first 5 Pokémon…');
  const page = await client.pokemon.listPokemon({ limit: 5, offset: 0 });
  console.log(page.results.map(r => r.name));

  console.log('\nIterating first 3 Pokémon via generator…');
  let count = 0;
  for await (const item of client.pokemon.iteratePokemon({ pageSize: 50 })) {
    console.log(item.name);
    if (++count >= 3) break;
  }

  // console.log('\nGetting Bulbasaur + its Generation…');
  // const { pokemon, generation } = await client.getPokemonWithGeneration('bulbasaur');
  // console.log('Bulbasaur:', pokemon.name, 'Generation:', generation?.name);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
