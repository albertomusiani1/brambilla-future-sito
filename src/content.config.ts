import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ID_COMMITTENTI } from './lib/committenti';

/**
 * Collection "progetti".
 *
 * Ogni file in `src/content/progetti/*.md` diventa una pagina
 * `/progetti/<nome-del-file>`. Lo schema qui sotto è la rete di sicurezza:
 * se un campo obbligatorio manca, ha il tipo sbagliato o è scritto male,
 * `npm run build` si interrompe con un errore che indica file e campo.
 *
 * `.strict()` fa fallire anche i campi non previsti: un `titollo` scritto
 * male non passa in silenzio.
 */
export const CATEGORIE_PROGETTO = [
  'Progettazione',
  'Montaggio',
  'Revisione',
  'Collaudo',
] as const;

export type CategoriaProgetto = (typeof CATEGORIE_PROGETTO)[number];

/**
 * Un disegno allegato al progetto: una tavola 2D o un modello 3D.
 *
 * - `disegno2d` vuole un SVG (o un PNG) in `public/disegni/`;
 * - `modello3d` vuole un **STL**, il formato che ogni CAD esporta, in
 *   `public/modelli/`, più un'anteprima PNG mostrata quando JavaScript è
 *   disattivato o mentre il modello si carica.
 */
const disegno = z
  .object({
    titolo: z.string().min(3).max(90),
    tipo: z.enum(['disegno2d', 'modello3d']),
    /** Percorso del file dalla root del sito, es. /modelli/puleggia.stl */
    file: z.string().startsWith('/'),
    /** Obbligatoria per i modelli 3D: è la ricaduta senza JavaScript. */
    anteprima: z.string().startsWith('/').optional(),
    /** Una riga di contesto: scala, revisione, materiale. */
    nota: z.string().max(160).optional(),
  })
  .strict()
  .refine((valore) => valore.tipo !== 'modello3d' || valore.anteprima !== undefined, {
    message: "un disegno di tipo modello3d deve avere anche il campo anteprima (l'immagine mostrata senza JavaScript)",
    path: ['anteprima'],
  });

export type Disegno = z.infer<typeof disegno>;

/**
 * Lo schema di un lavoro.
 *
 * **Obbligatori sono solo il titolo e l'abstract.** Tutto il resto è
 * facoltativo, e quello che non viene compilato semplicemente non compare:
 * niente riquadri vuoti, niente «Cliente: —». È la regola che permette di
 * pubblicare un lavoro appena si sa qualcosa, e di completarlo dopo.
 *
 * Le due eccezioni sono coppie che non hanno senso a metà, e infatti sono
 * controllate: un'immagine senza il suo testo alternativo (che è un difetto
 * di accessibilità) e un modello 3D senza anteprima (che senza JavaScript
 * lascerebbe un buco).
 */
const progetti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/progetti' }),
  schema: z
    .object({
      /** OBBLIGATORIO. Titolo del lavoro, usato come <h1> della sua pagina. */
      titolo: z.string().min(3).max(120),
      /** OBBLIGATORIO. L'abstract: apre la pagina ed è la meta description. */
      descrizioneBreve: z.string().min(20).max(160),

      /**
       * I punti chiave, sotto l'abstract: le cose che si devono capire senza
       * leggere tutto. Frasi brevi, non paragrafi.
       */
      puntiChiave: z.array(z.string().min(3).max(140)).max(6).optional(),

      /**
       * Id di un committente dell'anagrafica (`src/lib/committenti.ts`).
       * Scrivendone uno che non esiste, la build si ferma e lo dice: è il
       * modo di non ritrovarsi due grafie dello stesso nome.
       */
      committente: z.enum(ID_COMMITTENTI).optional(),

      /** Il tag del lavoro. Uno solo: i tag sono esclusivi per costruzione. */
      categoria: z.enum(CATEGORIE_PROGETTO).optional(),

      /** Data della commessa, formato AAAA-MM-GG. */
      data: z.coerce.date().optional(),

      /** Immagine di copertina. Senza, l'anteprima mostra un segnaposto. */
      immagine: z.string().startsWith('/').optional(),
      /** Testo alternativo: obbligatorio **se** c'è l'immagine. */
      immagineAlt: z.string().min(10).optional(),

      /** true per mostrare il lavoro fra quelli in evidenza in home. */
      inEvidenza: z.boolean().default(false),
      /** Rilevanza: numero crescente. È l'ordine deciso dal proprietario. */
      ordine: z.number().int().positive().optional(),
      /** Tavole e modelli mostrati nel visualizzatore, in fondo alla pagina. */
      disegni: z.array(disegno).max(8).optional(),
    })
    .strict()
    .refine((valore) => valore.immagine === undefined || valore.immagineAlt !== undefined, {
      message:
        "un lavoro con immagine di copertina deve avere anche immagineAlt (la descrizione per chi non vede l'immagine)",
      path: ['immagineAlt'],
    }),
});

export const collections = { progetti };
