/**
 * CONTENUTO — L'anagrafica dei committenti.
 *
 * È l'elenco unico delle aziende per cui abbiamo lavorato. Serve a due cose
 * insieme, ed è il motivo per cui sta in un file solo:
 *
 *   1. ogni lavoro punta a un committente di questa lista (campo
 *      `committente` nel file del progetto). Scrivendo un id che qui non
 *      esiste, `npm run build` si ferma e lo dice;
 *   2. la fascia «Con chi abbiamo lavorato» è generata da questa lista, e
 *      mostra **solo** i committenti con `visibile: true`.
 *
 * `visibile: false` nasconde il committente in tutto il sito pubblico.
 * `inHome` seleziona al massimo sette committenti visibili nella home.
 *
 * Per aggiungere un marchio:
 *   1. mettere il file in `public/img/clienti/` (SVG, o PNG largo almeno
 *      400 px e con lo sfondo trasparente);
 *   2. scrivere qui `logo` e `logoAlt`.
 *
 * Finché il marchio manca, il sito compone il nome nello stile del sito: una
 * soluzione che sta in piedi da sola e non sembra un buco in attesa.
 */
export interface Committente {
  /** Identificatore usato nei file dei progetti. Minuscolo, con i trattini. */
  id: string;
  /** Ragione sociale come va scritta sul sito. */
  nome: string;
  /** Percorso del marchio, es. /img/clienti/az-vacuum.svg */
  logo?: string;
  /** Testo alternativo del marchio: descrive il marchio, non l'azienda. */
  logoAlt?: string;
  /** Sito dell'azienda, se si vuole collegare il marchio. */
  sito?: string;
  /**
   * false per nasconderlo da referenze, filtri e schede del sito pubblico.
   */
  visibile: boolean;
  /** Presenza nella home, consentita solo quando visibile è true. */
  inHome: boolean;
}

export const committenti: Committente[] = [
  { id: 'az-vacuum', nome: 'AZ Vacuum', visibile: true, inHome: true },
  { id: 'revortex', nome: 'Revortex srl', visibile: true, inHome: true },
  { id: 'people-design', nome: 'People Design', visibile: true, inHome: true },
  { id: 'sl-servizio-lame', nome: 'SL Servizio Lame di Antonio Marchesini', visibile: true, inHome: true },
  { id: 'roscomec', nome: 'Roscomec di Rossi Fabio', visibile: true, inHome: true },
  { id: 'maunoa', nome: 'Maunoa srl', visibile: true, inHome: true },
  { id: 'exon-compositi', nome: 'Exon Compositi srl', visibile: true, inHome: true },
  /**
   * Committenti che non compaiono fra le referenze. Servono ai lavori che si
   * possono raccontare ma la cui committenza non è pubblicabile.
   */
  { id: 'costruttore-farmaceutico', nome: 'Costruttore di macchine automatiche, settore farmaceutico', visibile: false, inHome: false },
  { id: 'costruttore-packaging', nome: 'Costruttore di macchine per il packaging', visibile: false, inHome: false },
  { id: 'officina-meccanica', nome: 'Officina meccanica conto terzi', visibile: false, inHome: false },
  { id: 'fonderia', nome: 'Fonderia di alluminio', visibile: false, inHome: false },
  { id: 'oleodinamica', nome: 'Costruttore di impianti oleodinamici', visibile: false, inHome: false },
];

/** Gli id ammessi: li usa lo schema della collection per validare i file. */
export const ID_COMMITTENTI = committenti.map((c) => c.id) as [string, ...string[]];

/** Il committente con quell'id, o undefined se non c'è. */
export const trovaCommittente = (id: string | undefined): Committente | undefined =>
  id === undefined ? undefined : committenti.find((c) => c.id === id && c.visibile);

/** Solo quelli che vogliono comparire fra le referenze. */
export const committentiVisibili = (home = false): Committente[] => {
  const visibili = committenti.filter((c) => c.visibile && (!home || c.inHome));
  return home ? visibili.slice(0, 7) : visibili;
};
