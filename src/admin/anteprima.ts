/**
 * Anteprima pubblica dell'area amministrativa.
 *
 * L'admin di Giorgio parla con un server che esiste solo in sviluppo: un
 * plugin di Vite serve `/__admin/auth/*`, `/__admin/site` e `/__admin/upload`.
 * Online quel server non c'è, e non può esserci: il sito è statico.
 *
 * Questo modulo mette al suo posto un sostituto che vive **nel browser di chi
 * guarda**. Intercetta le stesse rotte e risponde con lo stesso formato,
 * tenendo i dati in `localStorage`. Il risultato è che l'interfaccia si può
 * aprire, sfogliare, modificare e riordinare online esattamente come in
 * locale — per deciderne l'aspetto e il funzionamento senza installare niente.
 *
 * Che cosa NON fa, e non deve sembrare che faccia:
 *  · non salva niente sul sito. «Pubblica» scrive nel tuo browser, non nei
 *    file del repository. Chi apre la pagina da un altro computer vede i
 *    contenuti di partenza;
 *  · non protegge niente. Il login accetta qualunque cosa, perché una
 *    verifica fatta nel browser è una verifica che chiunque può scavalcare.
 *    Per questo la pagina lo dichiara in cima, a caratteri grandi.
 *
 * In sviluppo questo file non fa assolutamente nulla: `import.meta.env.DEV` è
 * vero, la funzione non viene installata, e l'admin continua a parlare col
 * server vero di Giorgio senza accorgersi che questo modulo esiste.
 *
 * Il codice dell'admin non è stato toccato: il sostituto si innesta sotto,
 * al livello della rete. Così Giorgio può continuare a lavorare sui suoi file
 * senza che i due lavori si scontrino.
 */
export {};

if (!import.meta.env.DEV) installa();

type Ruolo = 'proprietario' | 'redattore' | 'bozze';

interface Account {
  email: string;
  ruolo: Ruolo;
  stato: 'attivo' | 'invitato';
  dal: string;
}

interface Archivio {
  revisione: number;
  stato: unknown;
  partenza: unknown;
  username: string;
  dentro: boolean;
  account?: Account[];
}

function installa(): void {
  const CHIAVE = 'projectune-admin-anteprima-v1';
  /** Oltre questa dimensione un'immagine non sta in `localStorage`. */
  const MASSIMO_UPLOAD = 1_500_000;

  const vuoto: Archivio = {
    revisione: 0,
    stato: null,
    partenza: null,
    username: 'admin',
    dentro: false,
  };

  const leggi = (): Archivio => {
    try {
      const salvato = localStorage.getItem(CHIAVE);
      return salvato ? { ...vuoto, ...(JSON.parse(salvato) as Archivio) } : { ...vuoto };
    } catch {
      return { ...vuoto };
    }
  };

  const scrivi = (archivio: Archivio): void => {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(archivio));
    } catch {
      /* Spazio esaurito o cookie bloccati: l'anteprima resta usabile, solo
         non si ricorda nulla al ricaricamento. Non è un errore da mostrare. */
    }
  };

  /**
   * Lo stato di partenza è quello che Astro ha messo nella pagina alla build:
   * i progetti e i committenti veri del sito. Si legge una volta e si
   * conserva, perché serve anche al «Ripristina».
   */
  const partenza = (): unknown => {
    const seme = document.querySelector<HTMLElement>('#admin-seed');
    return seme?.dataset['seed'] ? JSON.parse(seme.dataset['seed']) : { progetti: [], committenti: [] };
  };

  const json = (corpo: unknown, status = 200): Response =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const rispostaSito = (archivio: Archivio): Response =>
    json({
      revision: archivio.revisione,
      state: archivio.stato,
      baselineAt: new Date(0).toISOString(),
      atBaseline: JSON.stringify(archivio.stato) === JSON.stringify(archivio.partenza),
    });

  /** Un file caricato diventa un data URL: resta nella pagina, non parte. */
  const comeDataUrl = (file: File): Promise<string> =>
    new Promise((risolvi, rifiuta) => {
      const lettore = new FileReader();
      lettore.onload = () => risolvi(String(lettore.result));
      lettore.onerror = () => rifiuta(new Error('Lettura del file non riuscita.'));
      lettore.readAsDataURL(file);
    });

  async function rispondi(percorso: string, metodo: string, corpo: BodyInit | null | undefined): Promise<Response> {
    const archivio = leggi();

    // --- accesso ---------------------------------------------------------
    if (percorso === '/__admin/auth/session') {
      return archivio.dentro
        ? json({ username: archivio.username })
        : json({ error: 'Accesso richiesto.' }, 401);
    }

    if (percorso === '/__admin/auth/login') {
      const dati = JSON.parse(String(corpo ?? '{}')) as { username?: string };
      archivio.dentro = true;
      if (dati.username) archivio.username = dati.username;
      scrivi(archivio);
      return json({ username: archivio.username });
    }

    if (percorso === '/__admin/auth/logout') {
      archivio.dentro = false;
      scrivi(archivio);
      return json({ ok: true });
    }

    if (percorso === '/__admin/auth/credentials') {
      const dati = JSON.parse(String(corpo ?? '{}')) as { username?: string };
      if (dati.username) archivio.username = dati.username;
      scrivi(archivio);
      return json({ username: archivio.username });
    }

    // --- contenuti -------------------------------------------------------
    if (percorso === '/__admin/site') {
      if (archivio.partenza === null) {
        archivio.partenza = partenza();
        archivio.stato = structuredClone(archivio.partenza);
        scrivi(archivio);
      }

      if (metodo !== 'POST') return rispostaSito(archivio);

      const dati = JSON.parse(String(corpo ?? '{}')) as {
        action?: string;
        state?: unknown;
        revision?: number;
      };

      // Stesso controllo del server vero: due finestre aperte non si
      // sovrascrivono a vicenda in silenzio.
      if (dati.revision !== archivio.revisione) {
        return json({ error: 'Contenuti aggiornati in un’altra finestra. Ricarica prima di salvare.' }, 409);
      }

      archivio.revisione += 1;
      archivio.stato =
        dati.action === 'reset' ? structuredClone(archivio.partenza) : (dati.state ?? archivio.stato);
      scrivi(archivio);
      return rispostaSito(archivio);
    }

    // --- account ---------------------------------------------------------
    if (percorso.startsWith('/__admin/account')) {
      /**
       * Il proprietario di partenza è l'indirizzo dell'azienda, quello già
       * pubblicato sul sito: nell'anteprima non si inventano persone.
       */
      if (!archivio.account) {
        archivio.account = [
          {
            email: 'service.projectune@gmail.com',
            ruolo: 'proprietario',
            stato: 'attivo',
            dal: new Date().toISOString(),
          },
        ];
        scrivi(archivio);
      }

      if (percorso === '/__admin/account') return json({ account: archivio.account });

      const dati = JSON.parse(String(corpo ?? '{}')) as { email?: string; ruolo?: string };
      const email = (dati.email ?? '').trim().toLowerCase();
      const ruolo: Ruolo = dati.ruolo === 'bozze' ? 'bozze' : 'redattore';

      if (percorso === '/__admin/account/invita') {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return json({ error: 'Indirizzo email non valido.' }, 400);
        }
        if (archivio.account.some((a) => a.email.toLowerCase() === email)) {
          return json({ error: 'Questo indirizzo ha già accesso.' }, 409);
        }
        archivio.account.push({ email, ruolo, stato: 'invitato', dal: new Date().toISOString() });
        scrivi(archivio);
        return json({ account: archivio.account });
      }

      if (percorso === '/__admin/account/ruolo') {
        const voce = archivio.account.find((a) => a.email.toLowerCase() === email);
        if (!voce) return json({ error: 'Questo indirizzo non ha accesso.' }, 404);
        if (voce.ruolo === 'proprietario') {
          return json({ error: 'I poteri del proprietario non si cambiano.' }, 400);
        }
        voce.ruolo = ruolo;
        scrivi(archivio);
        return json({ account: archivio.account });
      }

      if (percorso === '/__admin/account/revoca') {
        const voce = archivio.account.find((a) => a.email.toLowerCase() === email);
        if (!voce) return json({ error: 'Questo indirizzo non ha accesso.' }, 404);
        if (voce.ruolo === 'proprietario') {
          return json({ error: 'Il proprietario non può revocare sé stesso.' }, 400);
        }
        archivio.account = archivio.account.filter((a) => a !== voce);
        scrivi(archivio);
        return json({ account: archivio.account });
      }
    }

    // --- immagini --------------------------------------------------------
    if (percorso === '/__admin/upload') {
      const file = corpo instanceof FormData ? corpo.get('file') : null;
      if (!(file instanceof File)) return json({ error: 'Nessun file ricevuto.' }, 400);
      if (file.size > MASSIMO_UPLOAD) {
        return json(
          { error: "Nell'anteprima le immagini devono stare sotto 1,5 MB: restano nel browser." },
          400
        );
      }
      return json({ path: await comeDataUrl(file) });
    }

    return json({ error: 'Non disponibile nell’anteprima.' }, 404);
  }

  // --- innesto sulla rete ------------------------------------------------
  const fetchVero = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const indirizzo =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const percorso = new URL(indirizzo, location.origin).pathname;
    if (!percorso.startsWith('/__admin/')) return fetchVero(input, init);
    try {
      return await rispondi(percorso, init?.method ?? 'GET', init?.body);
    } catch (errore) {
      return json({ error: (errore as Error).message }, 500);
    }
  };

  /**
   * La connessione di presenza tiene viva la sessione sul server vero. Qui
   * non c'è sessione da tenere viva: si restituisce un oggetto che sta zitto,
   * con lo stesso aspetto di quello vero.
   */
  const EventSourceVero = window.EventSource;
  const finta = () => ({
    readyState: 1,
    close() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  });

  window.EventSource = new Proxy(EventSourceVero, {
    construct(bersaglio, argomenti: [string | URL, EventSourceInit?]) {
      const percorso = new URL(String(argomenti[0]), location.origin).pathname;
      if (percorso === '/__admin/auth/presence') return finta() as unknown as EventSource;
      return new bersaglio(...argomenti);
    },
  });
}
