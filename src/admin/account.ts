/**
 * Comportamento della finestra Account.
 *
 * Sta in un file suo e non dentro `admin.ts` per una ragione pratica: quel
 * file è di Giorgio e ci sta ancora lavorando. Tenere separate le cose nuove
 * evita che i due lavori si scontrino quando si uniscono.
 *
 * Parla con tre rotte, che online sono servite da `anteprima.ts` con dati
 * finti e un domani saranno servite davvero:
 *   GET    /__admin/account            elenco di chi ha accesso
 *   POST   /__admin/account/invita     { email, ruolo }
 *   POST   /__admin/account/ruolo      { email, ruolo }
 *   POST   /__admin/account/revoca     { email }
 */
export {};

type Ruolo = 'proprietario' | 'redattore' | 'bozze';

interface Account {
  email: string;
  ruolo: Ruolo;
  stato: 'attivo' | 'invitato';
  dal: string;
}

const ETICHETTE: Record<Ruolo, string> = {
  proprietario: 'proprietario',
  redattore: 'scrive e pubblica',
  bozze: 'scrive, non pubblica',
};

const apri = document.getElementById('apri-account');
if (apri) avvia(apri);

function avvia(apri: HTMLElement): void {
  const finestra = document.getElementById('account') as HTMLDialogElement | null;
  const elenco = document.getElementById('account-elenco');
  const modulo = document.getElementById('account-invito') as HTMLFormElement | null;
  const errore = document.getElementById('account-errore');
  const esito = document.getElementById('account-esito');
  if (!finestra || !elenco || !modulo || !errore || !esito) return;

  const chiedi = async (percorso: string, dati?: unknown): Promise<unknown> => {
    const risposta = await fetch(`/__admin/account${percorso}`, {
      ...(dati
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Projectune-Admin': 'local-account' },
            body: JSON.stringify(dati),
          }
        : {}),
    });
    const risultato = await risposta.json();
    if (!risposta.ok) throw Error((risultato as { error?: string }).error ?? 'Operazione non riuscita.');
    return risultato;
  };

  const data = (iso: string): string =>
    new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(iso)
    );

  function disegna(account: Account[]): void {
    elenco!.replaceChildren();
    for (const voce of account) {
      const riga = document.createElement('li');

      const indirizzo = document.createElement('span');
      indirizzo.className = 'indirizzo';
      indirizzo.textContent = voce.email;
      riga.append(indirizzo);

      if (voce.stato === 'invitato') {
        const attesa = document.createElement('span');
        attesa.className = 'attesa';
        attesa.textContent = 'invito inviato · in attesa';
        riga.append(attesa);
      }

      if (voce.ruolo === 'proprietario') {
        const ruolo = document.createElement('span');
        ruolo.className = 'ruolo';
        ruolo.textContent = ETICHETTE.proprietario;
        riga.append(ruolo);
      } else {
        // I poteri si cambiano senza riaprire niente: il proprietario li
        // sceglie all'invito e li corregge qui quando cambiano le esigenze.
        const scelta = document.createElement('select');
        scelta.setAttribute('aria-label', `Poteri di ${voce.email}`);
        for (const valore of ['redattore', 'bozze'] as const) {
          const opzione = document.createElement('option');
          opzione.value = valore;
          opzione.textContent = ETICHETTE[valore];
          opzione.selected = voce.ruolo === valore;
          scelta.append(opzione);
        }
        scelta.onchange = async () => {
          scelta.disabled = true;
          try {
            await chiedi('/ruolo', { email: voce.email, ruolo: scelta.value });
            esito!.textContent = `${voce.email}: ora ${ETICHETTE[scelta.value as Ruolo]}.`;
            errore!.textContent = '';
          } catch (motivo) {
            errore!.textContent = (motivo as Error).message;
          } finally {
            scelta.disabled = false;
          }
        };
        riga.append(scelta);

        const quando = document.createElement('span');
        quando.className = 'ruolo';
        quando.textContent = `dal ${data(voce.dal)}`;
        riga.append(quando);
      }

      // Il proprietario non si revoca: è l'unico modo di non restare fuori.
      if (voce.ruolo !== 'proprietario') {
        const revoca = document.createElement('button');
        revoca.type = 'button';
        revoca.className = 'secondary';
        revoca.textContent = 'Revoca';
        // Conferma in due tempi: il secondo clic esegue. Niente finestra in
        // più sopra una finestra, che su mobile diventa illeggibile.
        let confermato = false;
        revoca.onclick = async () => {
          if (!confermato) {
            confermato = true;
            revoca.textContent = 'Confermi?';
            setTimeout(() => {
              confermato = false;
              revoca.textContent = 'Revoca';
            }, 4000);
            return;
          }
          revoca.disabled = true;
          try {
            await chiedi('/revoca', { email: voce.email });
            esito!.textContent = `Accesso revocato a ${voce.email}.`;
            errore!.textContent = '';
            await aggiorna();
          } catch (motivo) {
            errore!.textContent = (motivo as Error).message;
            revoca.disabled = false;
          }
        };
        riga.append(revoca);
      }

      elenco!.append(riga);
    }
  }

  async function aggiorna(): Promise<void> {
    const risultato = (await chiedi('')) as { account: Account[] };
    disegna(risultato.account);
  }

  apri.onclick = async () => {
    errore.textContent = '';
    esito.textContent = '';
    modulo.reset();
    try {
      await aggiorna();
      finestra.showModal();
    } catch (motivo) {
      const avviso = document.getElementById('feedback');
      if (avviso) avviso.textContent = (motivo as Error).message;
    }
  };

  modulo.onsubmit = async (evento) => {
    evento.preventDefault();
    const bottone = modulo.querySelector('button')!;
    const campi = new FormData(modulo);
    const email = String(campi.get('email') ?? '').trim();
    const ruolo = String(campi.get('ruolo') ?? 'redattore');
    bottone.disabled = true;
    errore.textContent = '';
    esito.textContent = '';
    try {
      await chiedi('/invita', { email, ruolo });
      esito.textContent = `Invito inviato a ${email}. Sceglierà la password dal collegamento ricevuto.`;
      modulo.reset();
      await aggiorna();
    } catch (motivo) {
      errore.textContent = (motivo as Error).message;
    } finally {
      bottone.disabled = false;
    }
  };
}
