import { z } from 'zod';
import { ValidationError } from './errors';

export const NamedAPIResourceSchema = z.object({
  name: z.string(),
  url: z.url(),
});
export type NamedAPIResource = z.infer<typeof NamedAPIResourceSchema>;

export const PokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  height: z.number(),
  weight: z.number(),
  abilities: z.array(
    z.object({
      ability: NamedAPIResourceSchema,
      is_hidden: z.boolean(),
      slot: z.number(),
    }),
  ),
  species: NamedAPIResourceSchema,
});
export type Pokemon = z.infer<typeof PokemonSchema>;

export const GenerationSchema = z.object({
  id: z.number(),
  name: z.string(),
  main_region: NamedAPIResourceSchema,
  pokemon_species: z.array(NamedAPIResourceSchema),
});
export type Generation = z.infer<typeof GenerationSchema>;

export function maybeValidate<T>(schema: z.ZodType<T>, data: unknown, enabled: boolean): T {
  if (!enabled) return data as T;

  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new ValidationError('Validation failed: ' + JSON.stringify(parsed.error.issues, null, 2));
  }

  return parsed.data;
}
