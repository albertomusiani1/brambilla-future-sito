/**
 * Isola del filtro dei lavori.
 *
 * Senza JavaScript la pagina resta utilizzabile: i lavori ci sono tutti, il
 * filtro per tag funziona lo stesso (lo fa il CSS con `:has()`), e i due
 * gruppi che richiedono calcolo — committente e ordinamento — sono nascosti,
 * perché un comando che non fa niente è peggio di un comando che non c'è.
 *
 * Con JavaScript l'isola prende il comando: marca il contenitore con
 * `data-js`, cosa che spegne le regole CSS del filtro, e da lì in poi decide
 * lei che cosa si vede. Fa tre cose:
 *
 *   1. filtra per tag e per committente (i tag sono esclusivi: uno per volta);
 *   2. ordina per rilevanza — l'ordine deciso dal proprietario — o per data
 *      della commessa, dalla più recente;
 *   3. impagina, nove lavori per pagina, cioè tre righe da tre.
 *
 * Non tocca la rete: i lavori sono già tutti nel documento, si limita a
 * mostrarne una parte. Per questo funziona anche offline e non ha stati di
 * caricamento.
 */
/**
 * `export {}` rende questo file un modulo: senza, TypeScript considera i
 * file di `src/scripts/` come un unico ambito globale e due isole che
 * dichiarano una funzione con lo stesso nome vanno in conflitto.
 */
export {};

const PER_PAGINA_DI_RIPIEGO = 9;

interface Testi {
  precedente: string;
  successiva: string;
  vaiAllaPagina: string;
  filtriAttivi: string;
}

function leggiTesti(radice: HTMLElement): Testi {
  const nodo = radice.querySelector<HTMLElement>('[data-testi-filtro]');
  return {
    precedente: nodo?.dataset['precedente'] ?? 'Precedente',
    successiva: nodo?.dataset['successiva'] ?? 'Successiva',
    vaiAllaPagina: nodo?.dataset['vaiAllaPagina'] ?? 'Pagina',
    filtriAttivi: nodo?.dataset['filtriAttivi'] ?? 'filtri attivi',
  };
}

function avvia(radice: HTMLElement): void {
  const elenco = radice.querySelector<HTMLElement>('[data-elenco]');
  const paginazione = radice.querySelector<HTMLElement>('[data-paginazione]');
  const vuoto = radice.querySelector<HTMLElement>('[data-nessun-risultato]');
  const conto = radice.querySelector<HTMLElement>('[data-conto-filtri]');
  if (!elenco || !paginazione || !vuoto) return;

  const testi = leggiTesti(radice);
  const voci = Array.from(elenco.querySelectorAll<HTMLElement>('li'));
  const perPagina = Number(radice.dataset['perPagina']) || PER_PAGINA_DI_RIPIEGO;

  /** L'ordine di partenza, che è quello della rilevanza deciso alla build. */
  const ordineIniziale = new Map(voci.map((voce, indice) => [voce, indice]));

  let pagina = 1;

  const scelto = (nome: string): string => {
    const input = radice.querySelector<HTMLInputElement>(`input[name="${nome}"]:checked`);
    return input?.value ?? '';
  };

  const disegna = (): void => {
    const tag = scelto('categoria');
    const committente = scelto('committente');
    const ordine = scelto('ordine');

    const passano = voci.filter(
      (voce) =>
        (tag === '' || voce.dataset['categoria'] === tag) &&
        (committente === '' || voce.dataset['committente'] === committente)
    );

    // L'ordinamento agisce sul documento: le schede vengono davvero
    // spostate, così l'ordine di lettura e quello visivo restano lo stesso.
    const ordinate = [...passano].sort((a, b) => {
      if (ordine === 'data') {
        const da = a.dataset['data'] ?? '';
        const db = b.dataset['data'] ?? '';
        // Un lavoro senza data va in fondo, non in cima.
        if (da === '' && db === '') return 0;
        if (da === '') return 1;
        if (db === '') return -1;
        return db.localeCompare(da);
      }
      return (ordineIniziale.get(a) ?? 0) - (ordineIniziale.get(b) ?? 0);
    });

    const pagine = Math.max(1, Math.ceil(ordinate.length / perPagina));
    if (pagina > pagine) pagina = pagine;

    const da = (pagina - 1) * perPagina;
    const visibili = new Set(ordinate.slice(da, da + perPagina));

    for (const voce of voci) voce.hidden = !visibili.has(voce);
    for (const voce of ordinate) elenco.append(voce);

    vuoto.hidden = ordinate.length > 0;
    elenco.hidden = ordinate.length === 0;

    const attivi = [tag, committente].filter((v) => v !== '').length;
    if (conto) {
      conto.hidden = attivi === 0;
      conto.textContent = String(attivi);
      conto.setAttribute('aria-label', `${attivi} ${testi.filtriAttivi}`);
    }

    disegnaPaginazione(pagine);
  };

  const disegnaPaginazione = (pagine: number): void => {
    paginazione.textContent = '';
    paginazione.hidden = pagine <= 1;
    if (pagine <= 1) return;

    const bottone = (
      etichetta: string,
      nome: string,
      versoLaPagina: number,
      disabilitato: boolean,
      corrente = false
    ): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = corrente ? 'paginazione__voce paginazione__voce--corrente' : 'paginazione__voce';
      b.textContent = etichetta;
      b.disabled = disabilitato;
      if (corrente) b.setAttribute('aria-current', 'page');
      else b.setAttribute('aria-label', nome);
      b.addEventListener('click', () => {
        pagina = versoLaPagina;
        disegna();
        // Riporta in cima all'elenco: cambiata pagina, si riparte a leggere
        // dalla prima scheda, non da dove si era rimasti a scorrere.
        elenco.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      return b;
    };

    paginazione.append(bottone('‹', testi.precedente, pagina - 1, pagina === 1));
    for (let i = 1; i <= pagine; i += 1) {
      paginazione.append(
        bottone(String(i), `${testi.vaiAllaPagina} ${i}`, i, false, i === pagina)
      );
    }
    paginazione.append(bottone('›', testi.successiva, pagina + 1, pagina === pagine));
  };

  for (const input of radice.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
    input.addEventListener('change', () => {
      pagina = 1;
      disegna();
    });
  }

  const azzera = radice.querySelector<HTMLButtonElement>('[data-azzera]');
  azzera?.addEventListener('click', () => {
    for (const nome of ['categoria', 'committente', 'ordine']) {
      const primo = radice.querySelector<HTMLInputElement>(`input[name="${nome}"]`);
      if (primo) primo.checked = true;
    }
    pagina = 1;
    disegna();
  });

  // Da qui in poi comanda l'isola: l'attributo spegne le regole CSS del
  // filtro senza JavaScript e accende i gruppi che senza non servono.
  radice.dataset['js'] = '';
  disegna();
}

const radice = document.querySelector<HTMLElement>('[data-filtro-lavori]');
if (radice) avvia(radice);
