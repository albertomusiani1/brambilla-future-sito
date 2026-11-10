# Area amministrativa PROJECTUNE — pubblicazione locale e reset

Avviare `npm.cmd run dev` (su altri sistemi `npm run dev`).
Login `http://localhost:4321/admin`, credenziali iniziali `admin` / `password`.
Dashboard `/admin/dashboard`; progetti e committenti `/admin/progetti`.
Usare la porta stampata da Astro se diversa.

## Pubblicazione reale su localhost

L'admin ora salva sul server locale. L'archivio privato è
`.admin-local/site-state.json`, con revisione per evitare che due finestre si
sovrascrivano. Ogni operazione richiede una sessione valida e viene validata
anche sul server, tramite lo schema Zod condiviso con la collection.

- “Salva bozza” salva privatamente e non cambia la versione pubblica.
- “Pubblica” aggiorna il Markdown in `src/content/progetti/`: il sito Astro legge
  i nuovi contenuti e genera anche la pagina dei nuovi progetti.
- “Salva committente” aggiorna l'anagrafica in `src/lib/committenti.ts`.
- Ordine, selezione home e visibilità sono applicati al sito locale.
- La configurazione della collection viene aggiornata quando cambiano i dati,
  così i nuovi committenti vengono riconosciuti senza riavviare il server.

Per vedere il risultato, aprire o ricaricare il sito pubblico. Gli editor admin
non si ricaricano automaticamente durante il salvataggio, per preservare i
moduli ancora in compilazione. In caso di modifiche al codice dell'admin,
ricaricare manualmente la pagina.

Il corpo pubblicato usa Markdown senza HTML o link eseguibili. I metadati SEO
sono adattati automaticamente per rispettare i vincoli del sito anche con titoli
lunghi o abstract brevi consentiti dallo schema.

Non è un deploy: nessun dato viene inviato a servizi esterni o a GitHub.
Le modifiche sono però reali nei file locali e sarebbero incluse in una build:
ripristinare il sito prima di esportarlo se si vogliono eliminare le prove.

## Ripristina sito dopo le prove

Il pulsante nel menu admin richiede conferma. Usa la copia immutabile creata
all'attivazione del collegamento, in `.admin-local/site-baseline.json`.
Questa copia conserva i Markdown, l'anagrafica, la configurazione della
collection, l'elenco degli upload già presenti e lo stato iniziale dei contenuti.
Non viene sostituita ad ogni pubblicazione o riavvio.

Il reset ripristina:

- Tutti i progetti pubblici iniziali, con testo, immagini e ordine originali.
- I committenti iniziali, con ordine e impostazioni di visibilità.
- La configurazione della collection.
- L'archivio admin iniziale: bozze e progetti di prova vengono rimossi.
- Gli upload iniziali: vengono eliminati solo i file generati dall'admin dopo
  la copia di ripristino, dentro `public/uploads/admin/`.

Il reset attende che Astro abbia ricaricato anche i contenuti pubblici, oltre
all'archivio admin. Le pagine pubbliche già aperte vengono aggiornate mediante
una notifica del server di sviluppo; il listener non viene incluso nella build.

Credenziali, login, codice dell'admin e altri file del progetto non vengono
resettati. Se la sessione è scaduta, bisogna rifare il login prima del reset.
Non eliminare `.admin-local/site-baseline.json` finché servono le prove:
è la copia necessaria al ripristino, indipendente dal tag Git precedente.
Le modifiche manuali ai file dei contenuti vengono rilevate e impediscono
salvataggi che le sovrascrivano; il reset ripristina esplicitamente la copia iniziale.

L'archivio browser della vecchia fase dimostrativa viene conservato nella chiave
`projectune-admin-prima-del-server-v1`. Non viene automaticamente pubblicato.
Il server ora è la fonte dei dati; il browser conserva soltanto una copia cache.

## Accesso

Login verificato sul server. Una connessione di presenza mantiene attiva la
sessione finché almeno una pagina admin è aperta, anche in una scheda in secondo
piano. Dopo la chiusura dell'ultima pagina, la sessione scade dopo un minuto.
“Esci” la revoca immediatamente. Accessi diretti a pagine admin senza sessione
rimandano a `/admin`. Upload e API di salvataggio/reset richiedono login.
Le credenziali modificabili persistono, con hash scrypt e sale, in
`.admin-local/credentials.json`: nessuna password nel frontend.
Cookie HttpOnly e SameSite=Strict, controllo origine e header dedicato,
limite ai tentativi falliti. Tutta `.admin-local/` è esclusa da Git e dal file server.

Il backend esiste solo in sviluppo locale, su localhost/loopback. Le pagine
admin sono disattivate nella build ordinaria e non sono nella sitemap pubblica.
Per un server online serviranno HTTPS, infrastruttura persistente e gestione
delle sessioni di produzione. Analytics rimane non configurato.

## Funzioni dell'interfaccia

Editor, ordinamento, immagini e conferme sono popup, con X sempre visibile,
Escape e clic esterno. Le modifiche non salvate richiedono una scelta prima di
chiudere. Pubblicazione e reset richiedono conferma.

Gli identificativi derivano automaticamente da titolo/nome, con suffissi per i
duplicati; modificare un titolo mantiene l'identificativo. I committenti si possono
creare direttamente dal progetto senza perdere la compilazione.

“Bozza” è indicato accanto al titolo. La versione pubblicata è conservata
separatamente: “Ripristina versione pubblicata” scarta la bozza. Per progetti mai
pubblicati, un messaggio segnala che non esiste una versione da recuperare.

Massimo 3 progetti selezionati per la home e 7 committenti visibili in home.
Check solo negli editor e nell'ordinamento. `visibile` nasconde il committente
nelle schede, nei filtri e nelle referenze; `inHome` richiede visibilità generale.
Il riordino ha drag and drop, Su/Giù e posizione numerica.

Upload: immagini PNG/JPEG/WebP/GIF/SVG statici, disegni SVG/PNG, modelli STL con
anteprima. Massimo 20 MB e 8 allegati. Il server genera nomi e percorsi in
`public/uploads/admin/`. Le immagini hanno anteprime cliccabili con sostituzione
ed eliminazione del riferimento. Il reset elimina i nuovi file delle prove;
rimuovere semplicemente un riferimento non elimina immediatamente il file.

Testi alternativi di copertine e loghi facoltativi, senza lunghezza minima.
Quando manca quello della copertina, il sito usa il titolo del progetto.

## Git e verifiche

Branch `giorgio/area-amministrativa`; tag precedente `ripristino-iniziale`,
commit `94a3f5c`. Il nuovo reset usa lo stato corrente all'attivazione, non quel
vecchio commit. Le modifiche al codice non sono ancora committate.

- `npm.cmd run check`, `npm.cmd run build`, `check:js`, `check:i18n`.
- `npm.cmd test`: test esistenti.
- `npm.cmd run check:auth`: login, durata, revoche e credenziali.
- `npm.cmd run check:uploads`: formati e limiti.
- `npm.cmd run check:committenti`: visibilità pubblica.
- `npm.cmd run check:site`: salvataggio, bozze, pubblicazione, conflitti,
  validazione server, persistenza, reset e conservazione di file/credenziali.
- `npm.cmd run check:admin`: verifica browser di pubblicazione reale e reset.

Impostando `ADMIN_TEST_HOLD_MS=65000`, il test browser tiene aperto l'editor per
oltre un minuto e poi pubblica, verificando che la sessione resti valida.

Il test browser richiede il server dev e il sito già ripristinato, per non
cancellare prove dell'utente. Pubblica fixture, verifica le pagine pubbliche,
poi usa il reset e confronta i contenuti con la copia originale; in caso di errore
ripristina comunque il sito. Gli altri test usano cartelle temporanee sotto reports.
Se cambiate, impostare `ADMIN_TEST_USERNAME` e `ADMIN_TEST_PASSWORD` per le
credenziali dei test. URL alternativo:
`node scripts/check-admin.mjs http://localhost:PORTA`.
