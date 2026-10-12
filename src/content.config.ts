import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { ID_COMMITTENTI } from './lib/committenti';
import { creaSchemaProgetto } from './lib/schema-progetto';
export { CATEGORIE_PROGETTO } from './lib/schema-progetto';
export type { CategoriaProgetto, Disegno } from './lib/schema-progetto';
const progetti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/progetti' }),
  schema: creaSchemaProgetto(ID_COMMITTENTI),
});
export const collections = { progetti };
