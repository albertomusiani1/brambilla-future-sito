# Come funziona questo sito — guida per capirci qualcosa

Questa guida è scritta per chi non fa il mestiere. Non dà per scontato niente:
parte da cos'è un sito web e arriva a come modificare il tuo. Ogni concetto è
ancorato a un file vero di questo progetto, così quando apri una cartella sai
cosa stai guardando.

Si legge dall'inizio alla fine la prima volta. Dopo si usa come manuale: la
[mappa del progetto](#5-la-mappa-del-progetto) e le
[ricette pratiche](#6-ricette-le-modifiche-più-comuni) sono le sezioni a cui
tornerai.

Gli ultimi capitoli cambiano registro: non spiegano più come è fatto *questo*
sito, ma gli strumenti che ci stanno sotto — [Git e GitHub](#8-git-e-github-la-macchina-del-tempo-del-progetto),
[Netlify](#9-netlify-chi-tiene-acceso-il-sito) — con le alternative possibili e
i casi in cui converrebbe sceglierle, e come ci si organizza
[per farne più d'uno](#17-da-un-sito-a-venti-fare-siti-per-più-clienti).

---

## Indice

1. [Che cos'è un sito web, davvero](#1-che-cosè-un-sito-web-davvero)
2. [Statico o dinamico: la scelta che cambia tutto](#2-statico-o-dinamico-la-scelta-che-cambia-tutto)
3. [I tre linguaggi del web](#3-i-tre-linguaggi-del-web)
4. [Perché non ho scritto dieci pagine a mano: Astro](#4-perché-non-ho-scritto-dieci-pagine-a-mano-astro)
5. [La mappa del progetto](#5-la-mappa-del-progetto)
6. [Ricette: le modifiche più comuni](#6-ricette-le-modifiche-più-comuni)
7. [Dal tuo computer al visitatore: il giro completo](#7-dal-tuo-computer-al-visitatore-il-giro-completo)
8. [Git e GitHub: la macchina del tempo del progetto](#8-git-e-github-la-macchina-del-tempo-del-progetto)
9. [Netlify: chi tiene acceso il sito](#9-netlify-chi-tiene-acceso-il-sito)
10. [Il modulo contatti: dove il sito smette di essere statico](#10-il-modulo-contatti-dove-il-sito-smette-di-essere-statico)
11. [Farsi trovare: come funziona davvero il SEO](#11-farsi-trovare-come-funziona-davvero-il-seo)
12. [Accessibilità: non è beneficenza](#12-accessibilità-non-è-beneficenza)
13. [Le verifiche automatiche e perché esistono](#13-le-verifiche-automatiche-e-perché-esistono)
14. [Glossario](#14-glossario)
15. [Cosa imparare dopo](#15-cosa-imparare-dopo)
16. [Rifarlo per un cliente](#16-rifarlo-per-un-cliente)
17. [Da un sito a venti: fare siti per più clienti](#17-da-un-sito-a-venti-fare-siti-per-più-clienti)

---

## 1. Che cos'è un sito web, davvero

Togliamo subito la magia. Un sito web è **una cartella di file su un computer
acceso**, e un programma che li spedisce a chi li chiede.

Quando scrivi `projectune.it/servizi` nel browser succede questo:

1. Il browser chiede a un servizio chiamato **DNS** — l'elenco telefonico di
   internet — a quale indirizzo numerico corrisponde `projectune.it`.
   Riceve qualcosa come `75.2.60.5`.
2. Il browser apre una conversazione con quel computer e dice, in sostanza:
   *«mandami la pagina `/servizi`»*. Questa richiesta viaggia in un linguaggio
   che si chiama **HTTP**.
3. Il computer dall'altra parte — il **server** — risponde con un numero e un
   contenuto. Il numero è il famoso codice di stato: `200` vuol dire «eccola»,
   `404` vuol dire «questa pagina non ce l'ho», `500` vuol dire «ho avuto un
   problema io».
4. Il browser riceve un file di testo pieno di tag, lo legge, si accorge che
   servono anche un foglio di stile e dei caratteri tipografici, li richiede
   pure quelli, e **disegna** il risultato sullo schermo.

Tutto qui. Un sito è file + un server che li consegna + un browser che li
interpreta.

> **Prova a vederlo con i tuoi occhi.** Apri il sito, premi `F12` (o tasto destro
> → *Ispeziona*), vai sulla scheda **Rete** e ricarica la pagina. Vedi l'elenco
> di tutte le richieste: la pagina, il CSS, i file dei caratteri, le immagini.
> Ognuna col suo codice di stato e il suo peso. Non c'è nient'altro.

Un dettaglio che conta: la home del tuo sito pesa **circa 139 kB alla prima
visita** — e due terzi sono i quattro file dei caratteri tipografici. Le altre
pagine ne chiedono **una ventina**, perché caratteri e foglio di stile restano
nella memoria del browser. Per riferimento, una singola foto scattata col
telefono pesa quindici volte tanto.

---

## 2. Statico o dinamico: la scelta che cambia tutto

Questa è la distinzione più importante di tutta la guida.

### Sito dinamico

Il server **costruisce la pagina nel momento in cui gliela chiedi**. Ogni
visitatore fa partire un programma che interroga un database, mette insieme i
pezzi e produce l'HTML lì per lì. È così che funzionano WordPress, un negozio
online, Facebook.

Serve quando il contenuto **dipende da chi guarda o cambia di continuo**: il
carrello della spesa, il saldo del conto, i commenti appena scritti.

Il prezzo: un computer che gira sempre, un database da mantenere, aggiornamenti
di sicurezza da installare (un WordPress non aggiornato è uno dei modi più comuni
di farsi violare un sito), e più visitatori = più costi.

### Sito statico

Le pagine **esistono già, scritte su disco**, uguali per tutti. Il server non
deve pensare: prende il file e lo spedisce. È il tuo caso.

Quello che ci guadagni:

| | Perché |
|---|---|
| **Velocità** | Non c'è niente da calcolare. La pagina parte subito. |
| **Sicurezza** | Non c'è database da violare né codice da far eseguire al server. La superficie d'attacco è quasi zero. |
| **Costo** | Consegnare file è così economico che i piani gratuiti bastano. |
| **Robustezza** | Non c'è niente che possa «andare giù»: nessun processo, nessuna connessione al database. |

Il limite: se il contenuto deve cambiare, va **ricostruito** il sito. Ma per un
sito vetrina, che cambia quando aggiungi un progetto — cioè poche volte
all'anno — è esattamente lo strumento giusto.

**È il motivo per cui il tuo sito prende 100 su 100 in prestazioni.** Non è
bravura: è che non c'è niente da aspettare.

---

## 3. I tre linguaggi del web

Ogni pagina web al mondo è fatta di tre cose. Metafora: costruire una casa.

### HTML — la struttura (i muri)

Dice **che cosa** sono le cose, non come appaiono. È fatto di *tag*, etichette
fra parentesi angolari che avvolgono il contenuto:

```html
<h1>Contatti</h1>
<p>Scriveteci per una valutazione di fattibilità.</p>
<a href="/servizi">Scopri i servizi</a>
```

`<h1>` è «titolo principale», `<p>` è «paragrafo», `<a>` è «collegamento».

Non è una formalità estetica: usare il tag giusto è ciò che permette a Google di
capire la pagina e a un cieco di navigarla col lettore di schermo. Un titolo
scritto come `<p>` in grassetto **sembra** un titolo, ma per una macchina non lo
è. Nel tuo sito ogni pagina ha esattamente un `<h1>` e i sottotitoli scendono in
ordine (`<h2>`, poi `<h3>`) senza salti: è una delle quindici verifiche
automatiche.

### CSS — l'aspetto (l'intonaco, i colori, i mobili)

Dice **come** devono apparire le cose. Si scrive: «tutti gli elementi di questo
tipo abbiano questo aspetto».

```css
h1 {
  font-size: 2.5rem;
  color: #303435;
}
```

Il tuo sito usa **CSS puro**, senza framework. Un framework (Tailwind, Bootstrap)
è una libreria di stili già pronti: fa risparmiare tempo a chi lo conosce già, ma
è un linguaggio in più da imparare, e fra tre anni potrebbe non esistere più. Il
CSS invece è uno standard: quello che c'è scritto oggi funzionerà nel 2040.

Tutto lo stile del sito sta in **un file solo**, `src/styles/global.css`, e i
valori importanti sono raccolti in cima sotto forma di *variabili*:

```css
:root {
  --marchio-antracite: #303435; /* l'antracite del logo */
  --marchio-blu:       #3093c9; /* il blu del logo */
  --colore-accento:    #1b6e9b; /* lo stesso blu, scurito quanto basta
                                   perché un testo sia leggibile */
  --space-4: 1rem;              /* l'unità base di spaziatura */
}
```

Cambiare `--colore-accento` in un punto solo cambia il colore di tutti i
pulsanti, di tutti i link e di tutti i dettagli del sito. È il senso delle
variabili: **un concetto, un posto**.

### JavaScript — il comportamento (l'impianto elettrico)

È l'unico dei tre che è un vero linguaggio di programmazione: fa succedere cose.
Reagisce ai clic, cambia la pagina senza ricaricarla, parla con altri computer.

Sul tuo sito ce n'è **14,6 kB in tutto, divisi in tre "isole"**, e ogni isola
viene scaricata solo dalla pagina che la usa davvero: il video del hero (solo in
home), il modulo contatti (solo in `/contatti`), il visualizzatore dei disegni
(solo nelle schede progetto). Tutto il resto è HTML e CSS. È una scelta precisa,
non una mancanza — il JavaScript va scaricato, letto ed eseguito dal telefono del
visitatore, e ogni riga costa tempo e batteria. Se un pulsante può funzionare
senza, funziona senza; e infatti anche le tre isole sono facoltative: senza
JavaScript il video resta un'immagine ferma, il modulo si invia ricaricando la
pagina e i disegni si vedono comunque, statici.

> **Il filo conduttore.** Il menu di navigazione, il filtro per categoria nella
> pagina Progetti, gli effetti al passaggio del mouse: tutte cose che di solito
> si fanno in JavaScript, e che qui sono fatte in CSS. Il filtro dei progetti in
> particolare funziona con dei pulsanti radio nascosti e una regola CSS che
> nasconde le schede non selezionate. Zero programmazione.

---

## 4. Perché non ho scritto dieci pagine a mano: Astro

### Il problema

Il tuo sito ha dieci pagine. Tutte hanno la stessa intestazione, lo stesso piè
di pagina, la stessa navigazione. Scritte a mano, quel pezzo di HTML sarebbe
copiato dieci volte.

Il giorno che aggiungi una voce al menu, devi ricordarti di modificarla in dieci
file. Ne dimentichi uno e il sito ha un menu diverso su una pagina. Con sei
progetti, ogni scheda progetto sarebbe un altro copia-incolla.

### La soluzione: un generatore di siti statici

**Astro** è un programma che gira **sul tuo computer**, non su quello del
visitatore. Legge dei file sorgente scritti in modo comodo per te, e ne produce
HTML normale, che è l'unica cosa che il browser sa leggere.

```
   src/            →   [ Astro ]   →      dist/
   (comodo                              (HTML puro,
   per te)                              per il browser)
```

Le due idee che risolvono il problema:

**I componenti.** Un pezzo di pagina riutilizzabile, scritto una volta.
`src/components/Header.astro` contiene l'intestazione. Le dieci pagine la
richiamano con una riga. Cambi il menu lì, cambia ovunque.

**I layout.** Lo scheletro comune. `src/layouts/BaseLayout.astro` dice: «ogni
pagina è fatta da un `<head>`, un link "salta al contenuto", l'intestazione, poi
il contenuto specifico, poi il piè di pagina». Ogni pagina fornisce solo la parte
che cambia.

Un file `.astro` è HTML normale con due poteri in più: può richiamare componenti,
e può contenere piccole porzioni di codice fra parentesi graffe. Questo:

```astro
<h1>{t('contatti.titolo')}</h1>
```

vuol dire: «metti qui il testo che sta nel dizionario alla voce
`contatti.titolo`». Al momento della build diventa `<h1>Contatti</h1>` e la
graffa sparisce. **Nell'HTML finale non resta niente di Astro.**

### Il dizionario dei testi

Nessuna parola visibile è scritta dentro i componenti. Stanno tutte in
`src/i18n/it.json`, un file organizzato per argomento:

```json
{
  "nav":      { "servizi": "Servizi", "contatti": "Contatti" },
  "contatti": { "titolo":  "Contatti" },
  "azioni":   { "invia":   "Invia la richiesta" }
}
```

Due vantaggi concreti. Primo: per cambiare una parola apri un file solo e non
rischi di rompere il codice. Secondo: per fare il sito in inglese si copia questo
file, si traducono i valori a destra e basta — nessun componente va riscritto.
(`i18n` è l'abbreviazione standard di *internationalization*: i-diciotto
lettere-n.)

### Gli altri nomi che vedrai

- **TypeScript** — è JavaScript con i controlli. Ti obbliga a dichiarare che tipo
  di dato è ogni cosa, e ti avvisa *prima* di pubblicare se hai scritto
  `progetto.titollo`. È il motivo per cui `npm run check` esiste.
- **Node.js** — il programma che permette a JavaScript di girare sul tuo computer
  invece che nel browser. Astro gira dentro Node.
- **npm** — il gestore dei pacchetti di Node: scarica le librerie che servono
  (`npm install`) e lancia i comandi del progetto (`npm run build`).
- **Zod** — un controllore di dati. Nel tuo sito controlla che ogni file
  progetto abbia tutti i campi giusti, e ferma la build se manca qualcosa.
- **Markdown** — un modo di scrivere testo formattato senza tag: `## Titolo` per
  un titolo, `- voce` per un elenco. I sei progetti sono scritti così.

---

## 5. La mappa del progetto

Aprendo la cartella vedi molte voci. La regola per orientarsi è una sola:

> **`src/` è quello che scrivi tu. `dist/` è quello che scrive il computer.**
> `dist/` non va mai modificato: viene cancellato e rifatto a ogni build.

```
projectune-sito/
│
├── src/                    ← IL SITO. Qui dentro lavori.
│   ├── pages/                 Una pagina per file: index.astro è la home,
│   │                          servizi.astro è /servizi, e così via.
│   ├── components/            Pezzi riutilizzabili: intestazione, piè di
│   │                          pagina, schede progetto, modulo contatti.
│   ├── layouts/               Lo scheletro comune a tutte le pagine.
│   ├── content/progetti/      UN FILE .md PER PROGETTO. Il posto che userai
│   │                          più spesso.
│   ├── i18n/it.json           Tutte le parole dell'interfaccia.
│   ├── lib/                   I dati: azienda.ts (indirizzo, telefoni…),
│   │                          servizi.ts, clienti.ts, testi-legali.ts.
│   ├── marchio/               Il logo in SVG, ricavato dal PDF del cliente.
│   └── styles/global.css      Colori, caratteri, spaziature: tutto lo stile.
│
├── public/                 ← File copiati così come sono: immagini, caratteri,
│                            video del hero, disegni e modelli 3D.
│   └── temi/tema-2.css        Il secondo vestito del sito (vedi la ricetta).
│
├── netlify/functions/      ← Il pezzo "vivo": riceve il modulo contatti.
│
├── dist/                   ← PRODOTTO DAL COMPUTER. Non toccare.
│
├── astro.config.mjs        ← Configurazione: indirizzo del sito, lingua.
├── netlify.toml            ← Regole di pubblicazione e sicurezza.
├── package.json            ← Elenco dei comandi e delle librerie.
│
├── README.md               ← Manuale operativo: cosa sostituire, come fare le cose.
├── GUIDA.md                ← Questo file: la teoria.
├── PLAN.md                 ← Diario di come è stato costruito e perché.
└── RESULTS.md              ← Esito delle quindici verifiche, con l'output reale.
```

Due cartelle che compariranno e che puoi ignorare: `node_modules/` (le librerie
scaricate, migliaia di file, si rigenera con `npm install`) e `.astro/` (appunti
temporanei di Astro).

---

## 6. Ricette: le modifiche più comuni

**Il ciclo è sempre lo stesso, per qualsiasi modifica:**

```bash
npm run dev     # apri http://localhost:4321 e lascialo acceso
                # modifica un file, salva → il browser si aggiorna da solo
npm run build   # quando sei soddisfatto
git add -A && git commit -m "descrivi cosa hai cambiato" && git push
                # Netlify ripubblica da solo in un paio di minuti
```

`localhost` vuol dire «questo computer»: quel sito lo vedi solo tu.

### Cambiare una parola dell'interfaccia

`src/i18n/it.json`. Cerca il testo, cambia la parte **a destra** dei due punti.
Mai le chiavi a sinistra.

### Cambiare indirizzo, telefono, partita IVA

`src/lib/azienda.ts`. È l'unico posto: da lì passano piè di pagina, pagina
contatti, privacy policy e i dati che legge Google.

Un'attenzione sul telefono: gli spazi lì dentro sono *spazi unificatori*, un
carattere speciale che impedisce al numero di spezzarsi a fine riga. Se lo
riscrivi con spazi normali una verifica te lo segnala.

### Cambiare un colore

`src/styles/global.css`, blocco `:root` in cima. Cambia il valore della
variabile, non le singole regole più sotto.

Attenzione al **contrasto**: testo troppo chiaro su fondo chiaro diventa
illeggibile per chi ha vista debole, e fa scendere il punteggio di accessibilità.
La regola è che testo e sfondo devono avere un rapporto di almeno 4,5 a 1.
Si controlla in due secondi su un sito come *WebAIM Contrast Checker*.

### Cambiare il vestito del sito

Il sito ha due linee grafiche. Quella di serie è scura e metallica; la seconda
fa sembrare il sito disegnato su un foglio da disegno tecnico, con le quote
rosse intorno alle sezioni. Contenuti e struttura non cambiano: cambia solo
l'aspetto.

```bash
npm run dev:tema2      # per guardarlo mentre lavori
npm run build:tema2    # per costruirlo davvero
```

Su Netlify si ottiene lo stesso aggiungendo la variabile `PUBLIC_TEMA=2` e
rilanciando la costruzione. Per tornare indietro basta toglierla.

### Aggiungere un progetto

Un file nuovo in `src/content/progetti/`. Il nome del file diventa l'indirizzo
della pagina. Il README ha un modello commentato riga per riga.

Se sbagli qualcosa, `npm run build` si ferma e ti dice **quale file e quale
campo**. È voluto: meglio un errore sul tuo computer che una scheda pubblicata a
metà.

### Cambiare i testi di privacy e cookie policy

`src/lib/testi-legali.ts`. Sono stringhe di testo normale, senza tag. Due sole
convenzioni: `{email}` viene sostituito col vero indirizzo, e
`[testo](/percorso)` diventa un collegamento.

### Aggiungere una pagina nuova

Crea un file in `src/pages/`, per esempio `certificazioni.astro`. Il nome
diventa l'indirizzo: `/certificazioni`. Copia la struttura di una pagina
esistente semplice — `chi-siamo.astro` è un buon modello — e cambia il
contenuto. Ricordati di aggiungere la voce al menu, in
`src/components/Header.astro`.

### Cambiare un'immagine

Le immagini stanno in `public/img/`. Sono file **SVG**: disegni descritti come
istruzioni geometriche («un cerchio qui, di questo colore») invece che come
griglie di pixel. Per questo pesano meno di un kilobyte e restano nitidi a
qualsiasi dimensione.

Puoi sostituirle con delle foto vere (JPG o PNG). Due accortezze: comprimile
prima (uno strumento come *Squoosh* le riduce dell'80% senza differenze
visibili), e aggiorna il **testo alternativo**, cioè la descrizione per chi non
la vede — per i progetti è il campo `immagineAlt`.

---

## 7. Dal tuo computer al visitatore: il giro completo

Cinque tappe. Vale la pena capirle perché quando qualcosa non funziona, il
problema sta sempre in una di queste.

### 1. Scrivi — il tuo computer

Modifichi i file in `src/`. Con `npm run dev` acceso, li vedi cambiare subito nel
browser sul tuo computer. Nessun altro li vede.

### 2. Registri — Git

**Git** è un registratore di modifiche. Fa la fotografia del progetto e la mette
in fila con le precedenti, con una descrizione: si chiama **commit**. Puoi
tornare a qualsiasi fotografia passata.

Non è un backup: è la storia di *perché* le cose sono come sono. Ogni commit
del tuo progetto spiega cosa cambia e per quale motivo. Il **capitolo 8** entra
nel dettaglio.

### 3. Condividi — GitHub

**GitHub** è un sito che ospita progetti Git. È la copia di riferimento: sta
fuori dal tuo computer, quindi sopravvive se il portatile cade. Con `git push`
mandi lì i tuoi commit.

Git e GitHub sono cose diverse: Git è il programma sul tuo computer, GitHub è il
posto dove lo si tiene in comune. Come «PDF» e «Dropbox». Il **capitolo 8** lo
spiega per esteso, con le alternative.

### 4. Pubblichi — Netlify

**Netlify** guarda il tuo repository su GitHub. Appena arriva un commit nuovo,
in automatico:

1. scarica il progetto;
2. esegue `npm install` e `npm run build`;
3. prende la cartella `dist/` prodotta e la copia sui suoi server sparsi per il
   mondo;
4. da quel momento il sito nuovo è online.

Se la build fallisce — un errore di sintassi, un campo mancante in un progetto —
**Netlify non pubblica niente e lascia online la versione precedente**, avvisandoti
dell'errore. È una rete di sicurezza importante: non puoi mettere online un sito
rotto per sbaglio.

### 5. Guarda — il browser del visitatore

Il visitatore chiede la pagina, Netlify gliela consegna dal server geograficamente
più vicino a lui, il browser la disegna. Torniamo al capitolo 1.

I due capitoli che seguono guardano dentro le tappe 2–4: **il capitolo 8** su Git
e GitHub, **il capitolo 9** su Netlify, tutti e due con le alternative possibili
e i casi in cui conviene sceglierle.

```
  tu scrivi        git commit         git push          in automatico
     ↓                 ↓                  ↓                   ↓
  [ src/ ] ──────► [ Git ] ────────► [ GitHub ] ───────► [ Netlify ]
                 storia locale     copia condivisa      build + pubblica
                                                              │
                                                              ▼
                                                     [ browser del visitatore ]
```

---

## 8. Git e GitHub: la macchina del tempo del progetto

Il capitolo 7 li ha nominati di sfuggita. Qui si guarda dentro, perché sono i
due strumenti che userai più spesso e sono anche quelli che vengono scambiati
l'uno per l'altro più spesso.

### Il problema che risolvono

Immagina di lavorare senza. Salvi i file, poi fai una modifica grossa, poi ti
accorgi che stavi meglio prima. Cosa fai? La risposta tradizionale è la cartella
piena di `sito_v2`, `sito_v2_finale`, `sito_v2_finale_DEFINITIVO`, e nessuno che
sappia più quale sia quella buona.

Ci sono tre domande a cui quella cartella non sa rispondere:

1. **Che cosa è cambiato fra una versione e l'altra, e perché?**
2. **Come torno indietro esattamente a com'era il 30 agosto?**
3. **Come facciamo in due a lavorarci senza sovrascriverci a vicenda?**

Git risponde a tutte e tre. È nato nel 2005 per gestire il codice del sistema
Linux, dove lavorano migliaia di persone contemporaneamente: se regge quello,
regge il tuo sito.

### Git: il registratore, e sta sul tuo computer

Git è **un programma**, non un sito. Gira sul tuo portatile, funziona senza
internet, e tiene in una cartella nascosta (`.git/`) la storia completa del
progetto.

L'unità di base è il **commit**: una fotografia di *tutti* i file in un dato
istante, più tre informazioni — chi, quando, e **perché**. Il perché è la parte
che conta, ed è quella che la gente salta.

Guarda la storia vera del tuo sito:

```console
$ git log --oneline
02d4cae Percorso Lavori: la voce accesa segue una riga di lettura
ef82313 Design: fondo unico scuro, hero pulito, percorso Lavori, tema 2
732da58 Design: grana, tipografia grande, animazioni allo scorrimento
6c18f5f Sistema grafico esagonale: il sito diventa tecnico
e67e180 Adotta il marchio, la palette e i contenuti di PROJECTUNE
```

Ogni riga è un punto a cui puoi tornare. Quel codice all'inizio (`02d4cae`) è
il nome della fotografia. Con `git show 732da58` vedi esattamente cosa cambiava
quel commit, riga per riga, e il messaggio lungo che spiega le ragioni.

**Non è un backup.** Un backup ti dà indietro i file. Git ti dà indietro i file
*e il ragionamento*. Fra otto mesi, quando ti chiederai perché il visualizzatore
dei disegni ha quella struttura strana con due componenti invece di uno, la
risposta è scritta nel commit che l'ha fatta.

**Il ramo** (*branch*) è una linea parallela di lavoro. Il tuo progetto ha un
ramo che si chiama `sito`. Se domani volessi provare un'idea rischiosa senza
toccare quello che funziona, faresti un ramo nuovo, sperimenteresti lì, e poi
decideresti se tenerlo o buttarlo. Il ramo principale resta intatto nel
frattempo.

### GitHub: la copia in comune, su internet

GitHub è **un sito web** che ospita repository Git, più uno strato di servizi
attorno.

> **La confusione da togliersi subito.** Git sta al tuo computer come GitHub sta
> a Dropbox. Git è il programma che tiene la storia; GitHub è il posto su
> internet dove quella storia vive in comune. Puoi usare Git senza GitHub (e
> funziona benissimo, per te solo). Non puoi usare GitHub senza Git.

Due comandi e hai capito il rapporto fra i due:

- `git push` — «manda i miei commit nuovi alla copia su GitHub»
- `git pull` — «portami i commit che stanno su GitHub e io non ho»

### Che cosa ci dà, in concreto, in questo progetto

Sei cose, tutte già successe davvero qui dentro.

**1. Tornare indietro.** Il 30 agosto il primo deploy vero ha mandato la home in
un ciclo di reindirizzamenti: una regola sbagliata in `netlify.toml`. Con Git la
soluzione peggiore possibile — «annulliamo tutto» — costa dieci secondi:
`git revert` crea un commit che disfa esattamente quello sbagliato, senza
cancellare la storia. Senza Git avresti dovuto ricordarti a mano cosa avevi
toccato.

**2. Sapere perché.** I messaggi di commit di questo progetto non dicono
«modifiche varie»: dicono cosa cambia, cosa è stato misurato e cosa è stato
scartato. È documentazione che non si può separare dal codice che descrive,
perché viaggia insieme a lui.

**3. È l'interruttore della pubblicazione.** Questa è la cosa da tenere a mente:
**`git push` non pubblica il sito. Pubblica il codice.** È Netlify che, vedendo
arrivare il codice nuovo, costruisce e pubblica il sito. Sono due passaggi
distinti, ed è per questo che a volte il push va a buon fine e il sito non
cambia — perché la build dopo è fallita.

**4. Il backup fuori sede.** Se il portatile cade nel water, il progetto è
intatto su GitHub. Ci vogliono due minuti per riaverlo su un altro computer:
`git clone`.

**5. Lavorare in più d'uno.** Quando io lavoro sul tuo progetto, lavoro su un
ramo mio e te lo mando. Tu guardi cosa cambia prima di accettarlo. Il meccanismo
si chiama **pull request**: letteralmente «richiesta di tirare dentro le mie
modifiche». GitHub te la mostra come una lista di differenze, riga per riga, con
uno spazio per commentare. Chi riceve decide se accettare, chiedere modifiche, o
rifiutare. Su un progetto tuo da solo puoi ignorarla; appena siete in due, è lo
strumento che evita i disastri.

**6. Il modello per il prossimo cliente.** Dalle impostazioni del repository
(*Settings* → spunta *Template repository*) GitHub ti mette un pulsante **Use
this template**: due clic e hai una copia nuova del progetto, con storia pulita,
pronta da riempire con i contenuti di un'altra azienda. Ne parla per esteso il
capitolo 17.

### Che cosa ti dà GitHub oltre a tenere i file

Sono servizi gratuiti che stanno lì e che quasi nessuno usa:

| Servizio | A cosa serve | Vale la pena per te? |
|---|---|---|
| **Issues** | Una lista di cose da fare attaccata al progetto, con discussioni | Sì: è il posto giusto dove annotare «manca la via della sede» invece di un foglietto |
| **Actions** | Automazioni che girano a ogni push | Utile più avanti: potrebbe far girare da sola le quindici verifiche prima di pubblicare |
| **Pages** | Hosting gratuito per siti statici | Alternativa a Netlify, con un limite grosso — vedi capitolo 9 |
| **Dependabot** | Ti avvisa quando una libreria che usi ha un problema di sicurezza | Sì, e si attiva con una spunta |
| **Releases** | Versioni marcate e scaricabili | Poco utile per un sito vetrina |

### Quanto costa

**Zero.** Repository pubblici e privati illimitati, collaboratori illimitati.
Si paga (attorno ai 4 $ per persona al mese, da verificare sul loro sito) solo
per funzioni da azienda: controlli di accesso fini, conformità, supporto.

Per il tuo uso — anche con venti siti di clienti — il piano gratuito basta.

### I due repository di questo progetto, e perché sono due

- `investimentiesoldi` — il repository originale, dove c'erano anche i tre file
  dell'applicazione che avevi prima.
- `brambilla-future-sito` — **solo il sito**, con una storia sua.

Li abbiamo separati su tua richiesta, ed era la scelta giusta per tre ragioni:
la storia del sito non è sporcata da modifiche che non lo riguardano; Netlify
costruisce solo quando cambia qualcosa che al sito interessa; e soprattutto, il
giorno che il sito va consegnato a qualcuno, si consegna quel repository e
basta, senza dovergli dare in mano anche il resto.

**Regola generale: un repository per cosa pubblicabile.** Un sito, un
repository. Due siti, due repository.

### Le alternative a GitHub

| | Cos'è | Vantaggi | Svantaggi | Quando sceglierlo |
|---|---|---|---|---|
| **GitHub** | Il più diffuso, di Microsoft | Tutti lo conoscono, integrazione nativa con Netlify/Vercel, ecosistema enorme, gratis | È di Microsoft, se questo ti pesa | **Il valore di riferimento.** Nel dubbio, questo |
| **GitLab** | Concorrente storico, anche installabile sui tuoi server | Strumenti di automazione più potenti già inclusi, versione gratuita installabile in proprio | Interfaccia più pesante, comunità più piccola | Se vuoi poter portare tutto in casa un domani |
| **Bitbucket** | Di Atlassian | Integrato con Jira e Trello | In calo, meno integrazioni | Solo se l'azienda usa già Jira |
| **Codeberg** | Associazione no-profit europea, senza scopo di lucro | Nessuna azienda dietro, dati in Europa, gratuito | Poche integrazioni automatiche, servizi minori | Se la sovranità dei dati è un requisito dichiarato |
| **Gitea / Forgejo** | Te lo installi tu su un server tuo | Controllo totale, costa solo il server | **Lo mantieni tu**: aggiornamenti, backup, sicurezza | Solo se hai già un server e voglia |
| **Nessun remoto** | Git solo sul tuo computer | Zero dipendenze esterne | Niente backup, niente collaborazione, e **Netlify non può costruire da solo** | Prototipi usa e getta |

> **La cosa più importante di questa tabella: non c'è vincolo.** Un repository
> Git è completo e autonomo — la storia intera sta nella cartella `.git/` sul
> tuo computer. Spostarlo da GitHub a GitLab è un comando
> (`git remote set-url`) e un push. Non perdi niente e non c'è niente da
> esportare. Questo è il motivo per cui la scelta di GitHub è a basso rischio:
> è reversibile in cinque minuti.

### Le due cose che confondono sempre

1. **Git non è GitHub.** Il primo è il registratore, il secondo è il magazzino.
2. **Fare push non è pubblicare.** Push manda il codice a GitHub. La
   pubblicazione è un'altra cosa, e la fa Netlify. Il prossimo capitolo.

---

## 9. Netlify: chi tiene acceso il sito

### Cos'è un hosting, in una riga

Un computer sempre acceso, con un indirizzo pubblico, che consegna file a chi
li chiede. Tutto qui. La differenza fra un hosting e un altro sta in quanto è
veloce, quanto costa, e quanto lavoro fa al posto tuo.

### Perché il tuo sito ha bisogno di pochissimo

Il capitolo 2 diceva che questo è un sito **statico**: le pagine sono già
scritte su disco. Non c'è un database da interrogare, non c'è PHP da eseguire,
non c'è WordPress da aggiornare. L'hosting deve solo **consegnare dei file**.

Consegnare file è l'operazione più banale e più ottimizzata di internet. È il
motivo per cui il tuo sito costa zero, non si rompe da solo, e non può essere
bucato: **non c'è niente da bucare**, non c'è un programma in esecuzione da
attaccare. Un sito WordPress compromesso è una notizia settimanale; una cartella
di file HTML non si compromette.

### Cosa fa Netlify per noi, punto per punto

Non è solo un posto dove appoggiare i file. Fa otto cose, e ognuna è lavoro che
altrimenti dovresti fare a mano.

**1. Costruisce da solo.** Guarda il repository su GitHub. Appena arriva un
commit: scarica il progetto, esegue `npm install` e `npm run build`, prende la
cartella `dist/` e la pubblica. Nel gergo si chiama *CI/CD* (integrazione e
distribuzione continua) e vuol dire questo: **tu spingi il codice, il sito
esce**. Se la build fallisce, Netlify **non pubblica niente** e lascia online la
versione buona precedente. È una rete di sicurezza: non puoi mettere online un
sito rotto per distrazione.

**2. Copia il sito in tutto il mondo.** Le pagine non stanno su un server solo,
ma su una **CDN**: decine di server in città diverse, ognuno con una copia. Un
visitatore di Bologna riceve la pagina da un server vicino, uno di Sydney da un
altro. Conta: la distanza fisica è latenza, e la latenza è quello che fa
sembrare un sito lento.

**3. Il lucchetto, gratis e automatico.** Il certificato HTTPS (quello che fa
apparire il lucchetto e toglie l'avviso «Non sicuro») viene richiesto,
installato e **rinnovato da solo** ogni tre mesi. Su un hosting tradizionale è
una pratica da fare a mano, o una voce a pagamento. Non è un dettaglio estetico:
senza, Chrome mette un avviso e Google penalizza.

**4. Il dominio.** Colleghi `www.projectune.it` al sito da un pannello,
seguendo istruzioni scritte. Netlify può anche fare da gestore DNS, oppure
lasciare che resti dove il dominio è stato comprato.

**5. Pubblicazioni atomiche e ritorno indietro in un clic.** Ogni pubblicazione
è una versione **completa e immutabile** del sito. Non esiste il momento in cui
metà dei file sono nuovi e metà vecchi. E dal pannello vedi tutte le
pubblicazioni passate con un pulsante *Publish deploy*: clicchi, e in tre
secondi il sito torna a com'era martedì scorso. È Git applicato al sito
pubblicato.

**6. Le anteprime.** Ogni ramo e ogni pull request ottiene **un indirizzo
temporaneo suo**, con sopra il sito costruito da quel ramo. Serve esattamente
per quello di cui parlavamo: guardare una modifica grafica *prima* che vada
online, su un indirizzo che puoi aprire dal telefono e mandare a qualcun altro.
È lo strumento più sottovalutato di tutto l'impianto.

**7. Le funzioni serverless.** È il pezzo che rende il tuo sito «statico con
un'eccezione». `netlify/functions/contact.ts` è un programma che **non gira mai**
finché qualcuno non invia il modulo contatti; in quel momento Netlify lo accende,
lui manda le due email, e si spegne. *Serverless* non vuol dire «senza server»:
vuol dire che il server non è tuo, non lo aggiorni, non lo paghi quando è fermo.
Per un modulo contatti che riceve dieci messaggi al mese è l'architettura
perfetta.

**8. Regole, segreti e registri.** `netlify.toml` contiene le intestazioni di
sicurezza (compresa la CSP che vieta il codice scritto dentro le pagine), i
reindirizzamenti e le regole di cache. Le chiavi dei servizi stanno nelle
variabili d'ambiente del pannello, **mai nel codice**. E ogni invocazione della
funzione contatti lascia un registro leggibile, che è dove si va a guardare
quando un'email non arriva.

### Quanto costa

Il piano gratuito, che è quello su cui gira il tuo sito:

| Voce | Limite del piano gratuito | Cosa vuol dire per un sito vetrina |
|---|---|---|
| Traffico | ~100 GB al mese | Il tuo sito pesa ~140 kB a visita: sono centinaia di migliaia di visite |
| Minuti di build | ~300 al mese | Una build tua dura ~2 minuti: circa 150 pubblicazioni al mese |
| Invocazioni di funzioni | ~125.000 al mese | Il modulo contatti ne userà qualche decina |
| Siti | Illimitati | Ci stanno tutti i clienti che vuoi |
| Membri del team | 1 | Il limite vero, se un giorno siete in due |

> **Verifica i numeri.** Le condizioni dei piani gratuiti cambiano, e a volte in
> peggio. Prima di prendere un impegno con un cliente, controlla la pagina vera:
> `netlify.com/pricing`. Vale per ogni numero di questo capitolo.

Se sfori, Netlify non spegne il sito: ti avvisa e ti chiede di passare al piano
a pagamento (attorno ai 19 $ al mese per postazione). Per un sito vetrina non
succederà.

### Quanto siamo legati a Netlify?

Questa è la domanda giusta da farsi su qualunque fornitore, e la risposta qui è
rassicurante: **pochissimo**.

Il risultato della build è `dist/`, una cartella di HTML, CSS, immagini. La
serve qualunque hosting del mondo, anche il più scalcinato. Le uniche due cose
legate a Netlify sono:

1. `netlify.toml` — intestazioni e reindirizzamenti. Ogni piattaforma ha il suo
   equivalente, si riscrive in un'ora.
2. `netlify/functions/contact.ts` — la funzione del modulo. Il codice è già
   scritto in modo da non dipendere da un fornitore di posta specifico; portarlo
   su Cloudflare Workers o su una funzione Vercel è mezza giornata.

**Traslocare tutto il sito: circa mezza giornata.** È poco, ed è voluto. Ogni
volta che un fornitore ti offre una comodità che ti incatena a lui, quella
comodità ha un prezzo nascosto.

### Le alternative

| | Cos'è | Vantaggi | Svantaggi | Il modulo contatti funziona? | Quando sceglierlo |
|---|---|---|---|---|---|
| **Netlify** | Piattaforma per siti statici, con funzioni | Il più semplice da capire, anteprime ottime, funzioni incluse, uso commerciale permesso nel piano gratuito | Limite di 1 persona nel piano gratuito, minuti di build contati | Sì, com'è ora | **Il valore di riferimento** per un sito vetrina di un cliente |
| **Cloudflare Pages** | Lo stesso, sulla rete Cloudflare | **Traffico illimitato** anche gratis, la rete più veloce del mondo, gratuito molto generoso | Interfaccia meno amichevole, le funzioni (*Workers*) hanno regole loro | Sì, ma la funzione va riscritta | **Se fai molti siti**: è quello che regge meglio la crescita a costo zero |
| **Vercel** | Concorrente diretto, di chi ha inventato Next.js | Esperienza di sviluppo eccellente, anteprime ottime | **Il piano gratuito vieta l'uso commerciale**: un sito di un cliente che paga, formalmente, non ci può stare | Sì | Progetti personali, o se paghi il piano Pro |
| **GitHub Pages** | Hosting gratuito dentro GitHub | Gratis, zero configurazione, sta dove sta già il codice | **Nessuna funzione serverless**, nessuna anteprima, intestazioni di sicurezza non configurabili | **No** — servirebbe un servizio esterno per il modulo | Documentazione, siti senza moduli |
| **Render** | Piattaforma generalista | Fa anche siti dinamici e database, se un domani servissero | Piano gratuito più stretto, i servizi gratuiti si «addormentano» | Sì | Se il progetto crescerà verso qualcosa di dinamico |
| **Hosting classico italiano** (Aruba, Register, Netsons) | Spazio web con FTP e PHP | Il cliente lo conosce e ha già la fattura italiana, assistenza in italiano al telefono | **Nessuna build automatica**: la cartella `dist/` si carica a mano via FTP a ogni modifica. Niente anteprime, HTTPS spesso da configurare | Sì, ma riscritto in PHP | Se il cliente ha già tutto lì e non vuole sentire ragioni |
| **VPS** (server tuo, tipo Hetzner) | Un computer a noleggio, vuoto | Controllo totale, costa pochi euro al mese | **Lo amministri tu**: aggiornamenti di sicurezza, certificati, backup, monitoraggio. È un lavoro vero | Sì, come vuoi tu | Mai, per un sito vetrina |
| **AWS S3 + CloudFront** | I mattoni grezzi di Amazon | Scalabilità illimitata, costo bassissimo a volume | Complicato da mettere in piedi, la fattura è a consumo e va tenuta d'occhio | Con AWS Lambda, da scrivere | Solo dentro un'azienda che è già su AWS |

### Come scegliere, in tre righe

- **Sito vetrina di un cliente, zero pensieri** → Netlify. È dove siamo.
- **Cinque o più siti, voglio restare a costo zero** → Cloudflare Pages.
- **Il cliente ha già Aruba e non si sposta** → si può fare, ma spiegagli cosa
  perde: ogni modifica diventa un caricamento manuale, e le anteprime spariscono.
- **Attenzione a Vercel** se il sito è di un'azienda che paga: il piano gratuito
  non lo consente.

### Due cose che non c'entrano con Netlify e che tutti confondono

**Il dominio non è l'hosting.** Il dominio (`projectune.it`) si compra da un
*registrar* — Cloudflare Registrar lo vende a prezzo di costo, Namecheap è
economico, Aruba e Register.it sono i più usati in Italia e costano un po' di
più ma fanno fattura italiana. Costa 10–20 € l'anno e **va rinnovato**: un
dominio scaduto è un sito sparito, ed è l'incidente più frequente e più stupido
che capita ai siti piccoli. Il collegamento fra il nome e il sito si fa con il
**DNS**, che è l'elenco telefonico di internet: dici «projectune.it sta qui», e
il mondo lo trova.

**Il sito non ti dà l'email.** Sono due servizi diversi. Oggi i contatti di
PROJECTUNE arrivano a una casella Gmail, e va benissimo. Se un domani il cliente
volesse `info@projectune.it`, serve un servizio di posta a parte: Google
Workspace (~6 €/utente al mese), Zoho Mail (ha un piano gratuito per un dominio),
o la casella inclusa in un hosting tradizionale. Non è una cosa che Netlify fa.

---

## 10. Il modulo contatti: dove il sito smette di essere statico

Un file HTML non può mandare email. L'HTML descrive, non agisce. Serve un
programma che giri su un computer acceso.

Ma abbiamo detto che un sito statico non ha un computer acceso. La soluzione si
chiama **funzione serverless**: un pezzetto di codice che sta fermo e non costa
niente, e **si accende solo quando serve**. Qualcuno invia il modulo, il codice
parte, fa il suo lavoro in mezzo secondo, si spegne. Nessun server da mantenere.

Il nome è fuorviante — un server c'è, ma non è tuo e non ti riguarda.

Il tuo modulo, quando qualcuno preme *Invia*, fa questo:

1. **Honeypot** — «barattolo di miele». C'è un campo nel modulo, invisibile
   grazie al CSS, che una persona non può compilare. I programmi automatici che
   girano per il web riempiendo moduli lo compilano sempre. Se è pieno, il
   sistema risponde «grazie, ricevuto» e butta via tutto senza dirlo. È
   un'esca.
2. **Limite di frequenza** — massimo cinque invii ogni quarto d'ora dallo stesso
   collegamento.
3. **Controllo dei dati** — email valida, messaggio non vuoto, consenso privacy
   spuntato. Questo controllo è rifatto **sul server**, anche se il browser l'ha
   già fatto: un malintenzionato può inviare dati direttamente, saltando la
   pagina. **Regola d'oro: non fidarsi mai di quello che arriva dal browser.**
4. **Verifica antispam** — Cloudflare Turnstile, l'alternativa moderna a «clicca
   sui semafori».
5. **Due email**: il riepilogo a chi ha scritto, la notifica a te.

### Le chiavi e perché non stanno nel codice

Per mandare email serve una password del servizio di posta. Quella password
**non è nel codice**, e non deve esserci mai: il codice sta su GitHub, e chiunque
lo legga leggerebbe anche la password.

Sta invece in una **variabile d'ambiente**: un valore che imposti nel pannello di
Netlify, che il programma legge quando gira, e che non compare da nessuna parte
nei file. Nel progetto c'è `.env.example`, che elenca **i nomi** delle variabili
con valori finti, così sai quali servono senza che i veri finiscano mai in giro.

Una delle quindici verifiche cerca proprio password scritte per sbaglio nel
codice. Non ne trova.

---

## 11. Farsi trovare: come funziona davvero il SEO

**SEO** sta per *Search Engine Optimization*: rendere un sito comprensibile ai
motori di ricerca. Non è un trucco, è buona educazione verso una macchina che
deve capire di cosa parli.

Google manda in giro dei programmi (i *crawler*) che seguono i collegamenti,
scaricano le pagine, le capiscono e le archiviano. Poi, quando qualcuno cerca
qualcosa, pesca dall'archivio.

Le cose che contano, tutte già a posto sul tuo sito:

- **Titolo e descrizione unici per pagina.** Il titolo è la riga blu cliccabile
  nei risultati (massimo 60 caratteri, oltre viene tagliato); la descrizione è
  il testo grigio sotto (fra 120 e 160). Stanno in `src/i18n/it.json`. Il sito
  **si rifiuta di costruirsi** se uno sfora: è un controllo automatico.
- **Un solo `<h1>` per pagina**, e i sottotitoli in ordine. È l'indice del
  documento.
- **Sitemap.** Un file che elenca tutte le pagine, così Google non deve scoprirle
  a tentoni. Si genera da solo a ogni build: `sitemap-index.xml`.
- **robots.txt.** Le istruzioni per i crawler. Anche questo generato
  automaticamente, così non può mai puntare all'indirizzo sbagliato.
- **Indirizzo canonico.** Ogni pagina dichiara qual è il suo indirizzo ufficiale.
  Evita che `/servizi` e `/servizi/` sembrino due pagine diverse col contenuto
  copiato.
- **Dati strutturati (JSON-LD).** Un blocchetto di dati in formato macchina che
  dice esplicitamente «questa è un'azienda, si chiama così, sta qui, apre a
  quest'ora». È quello che alimenta le schede aziendali nei risultati.
- **Anteprime social (Open Graph).** Quando incolli un link su WhatsApp o
  LinkedIn e compare un riquadro con immagine e titolo, sono questi dati.
- **Velocità e telefono.** Google penalizza i siti lenti e quelli che sul
  cellulare non si leggono. Il tuo prende 100 su 100 in entrambi.

### Perché adesso il sito è bloccato

C'è un'intestazione `X-Robots-Tag: noindex, nofollow` che dice ai motori di non
mettere il sito nei risultati. È voluto: dentro ci sono ancora dati inventati —
partita IVA, indirizzo, telefono — e la home li dichiara a Google come scheda
aziendale vera. Un'anagrafica finta indicizzata si toglie male, perché i motori
tengono le pagine in cache per settimane dopo che le hai corrette.

**Una sottigliezza che quasi tutti sbagliano.** Per nascondere un sito la
tentazione è scrivere `Disallow: /` nel robots.txt. È controproducente:
`Disallow` vieta di **leggere** la pagina, e un motore che non la legge non può
nemmeno accorgersi che gli stai chiedendo di non indicizzarla — l'indirizzo può
finire lo stesso nei risultati, solo senza descrizione, che è peggio. La
combinazione corretta è quella che hai: **lettura permessa, indicizzazione
negata**.

Quando i contenuti saranno veri, si toglie un blocco da `netlify.toml` e si
registra il sito su Google Search Console. Ci vogliono comunque giorni o
settimane prima che compaia: è normale.

---

## 12. Accessibilità: non è beneficenza

Accessibilità vuol dire che il sito è usabile anche da chi non vede, non usa il
mouse, non distingue i colori, o semplicemente sta guardando il telefono al sole.

Non è un gesto caritatevole: è un requisito di legge per molti soggetti in
Europa, i motori di ricerca la premiano, e le stesse scelte migliorano il sito
per tutti. Le sottotitolazioni nate per i sordi le usano tutti in metropolitana.

Cosa c'è di concreto nel tuo sito:

- **Ogni immagine ha una descrizione testuale.** Un lettore di schermo la legge
  a voce a chi non vede.
- **Si naviga interamente da tastiera**, col tasto Tab, e c'è sempre un contorno
  ben visibile su dove ti trovi. Molti siti lo tolgono perché «è brutto»: è un
  errore che rende il sito inutilizzabile a chi non può usare il mouse.
- **Un collegamento «Vai al contenuto principale»** in cima, invisibile finché
  non premi Tab. Serve a saltare il menu, che altrimenti un lettore di schermo
  ti rilegge daccapo su ogni pagina.
- **Contrasto verificato** su tutte le combinazioni di colore.
- **Rispetto delle animazioni ridotte.** Chi soffre di vertigini può chiedere al
  sistema operativo di eliminare le animazioni: il sito lo rileva e obbedisce.
- **Il modulo è etichettato bene**: ogni campo ha la sua etichetta collegata, gli
  errori sono annunciati a voce.

Punteggio di accessibilità: 100 su 100. Che non vuol dire perfetto — vuol dire
che non ci sono errori rilevabili da una macchina. Il test vero è provare a
navigare il sito con la sola tastiera.

---

## 13. Le verifiche automatiche e perché esistono

Il progetto ha quindici controlli che si lanciano da riga di comando. L'esito
dell'ultima esecuzione, con l'output vero dei comandi, è in `RESULTS.md`.

L'idea di fondo: **una macchina non si stanca e non si distrae**. Se un controllo
può essere automatico, deve esserlo, perché fra sei mesi ti sarai dimenticato di
farlo a mano.

I più utili nel quotidiano:

| Comando | Cosa ti dice |
|---|---|
| `npm run build` | Il sito si costruisce? Se no, dove sta l'errore |
| `npm run check` | Ci sono errori di programmazione o refusi nei nomi? |
| `npm test` | Il modulo contatti si comporta come deve, in tutti i casi |
| `npm run check:pages` | Tutte le pagine rispondono, la 404 funziona |
| `npm run check:links` | Nessun collegamento interno è rotto |
| `npm run check:responsive` | Nessuna pagina esce dallo schermo, a nessuna dimensione |

Il concetto più importante è quello che gli sviluppatori chiamano *fail fast*:
**meglio un errore rumoroso subito che un problema silenzioso dopo**. Per questo
la build si interrompe se un progetto ha un campo mancante, se un titolo supera i
60 caratteri o se manca una traduzione. Sembra severo, ed è esattamente il punto.

---

## 14. Glossario

| Parola | Che cosa vuol dire |
|---|---|
| **Browser** | Il programma con cui navighi: Chrome, Safari, Firefox |
| **Server** | Un computer sempre acceso che risponde alle richieste |
| **DNS** | L'elenco telefonico che traduce i nomi in indirizzi numerici |
| **HTTP / HTTPS** | Il linguaggio delle richieste web. La S è la versione cifrata |
| **HTML** | Il linguaggio della struttura di una pagina |
| **CSS** | Il linguaggio dell'aspetto |
| **JavaScript** | Il linguaggio del comportamento |
| **Tag** | Un'etichetta HTML, tipo `<p>` |
| **Sito statico** | Pagine già pronte su disco, uguali per tutti |
| **Sito dinamico** | Pagine costruite al momento, diverse per ciascuno |
| **Build** | Il passaggio che trasforma i sorgenti in sito pubblicabile |
| **Deploy** | La pubblicazione online del risultato della build |
| **Astro** | Il generatore che costruisce il sito |
| **Componente** | Un pezzo di pagina riutilizzabile |
| **Layout** | Lo scheletro comune a più pagine |
| **Git** | Il programma che registra la storia delle modifiche |
| **Commit** | Una fotografia del progetto, con descrizione |
| **Repository** | Il progetto con tutta la sua storia |
| **GitHub** | Il sito che ospita i repository |
| **Netlify** | Il servizio che costruisce e pubblica il sito |
| **Serverless** | Codice che si accende solo quando serve |
| **Variabile d'ambiente** | Un valore segreto tenuto fuori dal codice |
| **SEO** | Rendersi comprensibili ai motori di ricerca |
| **Sitemap** | L'elenco delle pagine per i motori |
| **Crawler** | Il programma che i motori mandano a leggere i siti |
| **Canonical** | L'indirizzo ufficiale di una pagina |
| **JSON-LD** | Dati in formato macchina dentro la pagina |
| **Responsive** | Che si adatta a schermi di ogni dimensione |
| **SVG** | Immagine descritta come geometria, non come pixel |
| **Markdown** | Modo semplice di scrivere testo formattato |
| **npm** | Il gestore dei pacchetti e dei comandi del progetto |
| **localhost** | «Questo computer»: il sito che vedi solo tu |
| **Branch** (ramo) | Una linea di lavoro parallela, che non tocca quella principale |
| **Push / Pull** | Mandare i propri commit al remoto / portarsi a casa quelli degli altri |
| **Remoto** | La copia del repository che sta su internet, per esempio su GitHub |
| **Pull request** | La proposta di far entrare le proprie modifiche, con le differenze da rivedere |
| **Clone** | La copia locale di un repository remoto |
| **CI/CD** | La catena automatica che, a ogni push, costruisce e pubblica |
| **CDN** | La rete di server sparsi nel mondo che consegna le pagine dal più vicino |
| **Rollback** | Il ritorno a una versione pubblicata prima, in un clic |
| **Anteprima di deploy** | L'indirizzo temporaneo dove si guarda una modifica prima che vada online |
| **Registrar** | Chi ti vende e ti rinnova il dominio. Non è l'hosting |
| **CMS** | Il pannello con cui chi non programma scrive i contenuti |
| **Monorepo** | Un repository solo che contiene più progetti o più siti |
| **Piano gratuito** (*free tier*) | La soglia sotto la quale un servizio non si paga. Cambia: va verificata |

---

## 15. Cosa imparare dopo

In ordine di utilità per te, non di difficoltà.

**Prima cosa, l'unica davvero indispensabile: gli strumenti per sviluppatori del
browser.** Premi `F12` su qualsiasi sito. Scheda *Elementi*: vedi l'HTML e puoi
modificarlo dal vivo — non cambi il sito vero, solo quello che vedi tu, quindi
puoi sperimentare senza paura. Scheda *Rete*: vedi ogni file scaricato, con peso
e tempo. Imparare a leggerli vale più di qualsiasi corso.

**Poi HTML e CSS, in quest'ordine.** Sono le due cose che ti servono davvero per
mettere le mani sul tuo sito. JavaScript può aspettare: il tuo sito quasi non lo
usa.

Due risorse, entrambe gratuite e in italiano:

- **MDN Web Docs** (`developer.mozilla.org`) — la documentazione di riferimento,
  scritta da Mozilla. È il posto dove si va a controllare come funziona una cosa.
- **web.dev** (`web.dev/learn`) — corsi guidati di Google, con capitoli separati
  su HTML, CSS, accessibilità e prestazioni.

**Un consiglio sul metodo.** Non studiare in astratto: apri il tuo sito, cambia
un colore, ricarica, guarda cosa succede. Poi rompi qualcosa apposta e guarda
l'errore. Git ti protegge — con `git checkout .` torni all'ultima versione
salvata e non hai perso niente. È il modo più veloce per imparare, e l'unico che
resta in testa.

---

## 16. Rifarlo per un cliente

> «Se volessi creare un sito per un'azienda esterna simile a questo, potrei farlo
> funzionare così?»

**Sì.** Anzi, è esattamente l'uso per cui un progetto così ha senso: la parte
faticosa — impaginazione, accessibilità, SEO, modulo contatti, verifiche — è già
fatta e non dipende da chi è il cliente. Ma la parte tecnica è la metà facile.
Quella che fa danni, quando il sito è di qualcun altro, è l'altra.

### La parte tecnica: mezza giornata di lavoro, più i contenuti

Il progetto è già un modello riutilizzabile. Su GitHub puoi marcare il
repository come *template* (Settings → spunta «Template repository»): da lì il
pulsante **Use this template** crea una copia nuova, con storia pulita, in due
clic.

Poi cambi **solo i contenuti**, in nove file:

| File | Cosa contiene |
|---|---|
| `src/lib/azienda.ts` | Ragione sociale, indirizzo, telefono, partita IVA, orari |
| `src/i18n/it.json` | Tutte le etichette, i titoli, i testi per Google |
| `src/lib/servizi.ts` | I servizi offerti |
| `src/lib/testi-legali.ts` | Privacy e cookie policy |
| `src/content/progetti/*.md` | I casi da mostrare |
| `src/pages/chi-siamo.astro` | Storia, valori, persone |
| `src/pages/index.astro` | Le cifre della home |
| `src/styles/global.css` | Colori, caratteri, spaziature |
| `astro.config.mjs` | Il dominio |

Più le immagini in `public/img/` e il nome in `package.json`.

**Non tocchi niente** di `src/components/`, `src/layouts/`,
`netlify/functions/`, `scripts/`, `tests/`: è la macchina, e va bene com'è. È il
senso di aver tenuto ogni parola fuori dai componenti.

Realisticamente: mezza giornata per la parte tecnica e il cambio di veste
grafica, più il tempo di scrivere i contenuti veri — che di solito è la cosa che
allunga i tempi, e che dipende dal cliente più che da te.

### Cosa cambia davvero quando il cliente non sei tu

Qui stanno i problemi veri, e nessuno è di programmazione.

**Chi possiede cosa.** È la domanda più importante e quella che si dimentica
sempre. Dominio, repository GitHub, account Netlify, caselle email, chiavi dei
servizi: **intestali al cliente**, e fatti dare accesso come collaboratore.
Costa dieci minuti in più all'inizio ed evita la situazione classica — il
cliente cambia fornitore, o voi vi salutate, e il suo sito è appeso a un account
tuo. Se il dominio è intestato a te, tecnicamente il sito è tuo: è un guaio
legale ed è un pessimo modo di lavorare.

**Chi aggiorna i contenuti.** Un cliente che non usa Git non può aggiungere un
progetto. Hai tre strade, in ordine di sforzo:

1. **Lo fai tu.** Onesto e semplice, se sono due o tre modifiche all'anno. Va
   messo per iscritto: quante, in che tempi, a che condizioni.
2. **Gli insegni l'editor di GitHub.** Poco noto e sorprendentemente efficace:
   `github.com` permette di modificare un file `.md` direttamente dal browser —
   si apre il file, matita in alto a destra, si scrive, *Commit changes*.
   Netlify se ne accorge e ripubblica da solo. Per aggiungere un progetto a un
   sito come questo è più che sufficiente, e non richiede di installare niente.
3. **Aggiungi un CMS.** Esistono pannelli di amministrazione gratuiti che
   scrivono su Git al posto tuo — *Decap CMS*, *Sveltia CMS*, *TinaCMS*: il
   cliente vede un modulo con dei campi, salva, e sotto succede un commit. Sono
   una mezza giornata di configurazione e vanno mantenuti. Ha senso se il sito
   cambia spesso o se le persone che ci scrivono sono più d'una.

**Chi si prende la responsabilità dei testi legali.** La privacy policy non la
scrivi tu, e non la scrive nemmeno un modello: la **verifica il cliente**, che è
il titolare del trattamento e ne risponde. Tu fornisci una base coerente con
quello che il sito raccoglie davvero — come quella che c'è qui — e la fai
rileggere a chi di dovere. Vale lo stesso per i dati societari e per qualunque
affermazione sui prodotti.

**Chi mantiene.** Le librerie invecchiano, Node cambia versione, Netlify
ridisegna l'interfaccia. Un sito così non marcisce in fretta — è statico, non
c'è un WordPress da aggiornare ogni mese — ma una passata di `npm update` e una
build di controllo una o due volte l'anno servono. Decidi in anticipo se è
compreso o se è a chiamata.

### Quanto costa tenerlo in piedi

| Voce | Costo |
|---|---|
| Dominio `.it` | 10–20 € l'anno |
| Netlify, piano gratuito | 0 € — 100 GB di traffico e 300 minuti di build al mese, per un sito vetrina è abbondante |
| Servizio di posta transazionale | 0 € nei piani gratuiti, fino a qualche migliaio di email al mese |
| Antispam | 0 € |

In pratica: **il dominio, e basta**. È uno degli argomenti di vendita più forti
rispetto a un WordPress in hosting condiviso, che parte da qualche decina di
euro l'anno e va aggiornato.

### Quando questo impianto NON è la risposta

Non è adatto a tutto. Se il cliente ti chiede una di queste cose, serve
un'architettura diversa, e conviene dirlo subito:

- **Negozio online.** Carrello, pagamenti, magazzino: servono Shopify o
  WooCommerce, o almeno un servizio di e-commerce agganciato.
- **Area riservata con login.** Richiede un server che sappia chi sei.
- **Prenotazioni, disponibilità in tempo reale.** Idem.
- **Un blog con molti autori e uscite settimanali.** Tecnicamente si fa, ma
  senza un CMS diventa un lavoro per te tutte le settimane.
- **Un cliente che vuole spostare i blocchi da solo**, alla Wix o alla Squarespace.
  Quella libertà qui non c'è: il layout è deciso nel codice. Per certi clienti è
  un pregio — il sito non si imbruttisce da solo — per altri è un limite
  insopportabile. Meglio saperlo prima di firmare.

### Il consiglio pratico

Per il primo cliente, **copia questo progetto e sostituisci i contenuti**. Non
provare a costruirti subito un modello universale: scoprirai solo lavorando sul
secondo e sul terzo sito quali parti cambiano davvero e quali no, e a quel punto
astrarrai le cose giuste invece di quelle che immaginavi.

E tieni la disciplina che c'è già in questo progetto: i contenuti separati dal
codice, le verifiche che girano prima di pubblicare, il `README` che spiega cosa
sostituire. Su un sito tuo sembrano pignolerie. Su un sito di qualcun altro, che
riaprirai fra otto mesi senza ricordarti niente, sono la differenza fra
mezz'ora e mezza giornata.

---

## 17. Da un sito a venti: fare siti per più clienti

Il capitolo 16 risponde alla domanda «posso rifarlo per un'azienda esterna?» e
si occupa di **un** cliente: cosa cambiare, chi possiede cosa, chi aggiorna i
testi. Questo capitolo parte da dove finisce quello, e si occupa del resto:
**come ci si organizza quando i siti diventano tre, cinque, venti**, e quali
scelte prese al secondo sito te ne fanno risparmiare cento al ventesimo.

### Tre modi di organizzarsi, e quando passare dall'uno all'altro

| | Com'è fatto | Vantaggi | Svantaggi | Quando |
|---|---|---|---|---|
| **A. Un repository e un sito per cliente** | Ogni cliente ha il suo repository GitHub e il suo sito Netlify, indipendenti | Semplicissimo. Un cliente non può rompere il sito di un altro. Consegnabile: gli dai il repository e sei fuori | Una correzione utile a tutti va ricopiata a mano su ognuno | **Da 1 a 5 siti.** È dove sei adesso |
| **B. Repository modello + copie** | Tieni un repository «modello» aggiornato; ogni cliente nasce da una sua copia | Il cliente nuovo parte in dieci minuti già corretto. Le copie restano indipendenti | Le copie divergono col tempo: dopo un anno nessuna è più uguale al modello | **Da 3 a 15 siti.** Il passo naturale dopo il secondo cliente |
| **C. Un solo codice, tanti siti** | Un repository unico; i contenuti di ogni cliente in una cartella, e la build produce N siti | Correggi una volta per tutti. Aggiorni le librerie una volta sola | Un errore va online su venti siti insieme. Personalizzare per uno solo diventa difficile. Serve più mestiere | **Oltre i 10–15 siti**, e solo se sono davvero simili |

Il consiglio è quello che il capitolo 16 dà già e che vale la pena ripetere:
**non partire dal C**. Costruire l'astrazione giusta richiede di aver visto
almeno tre clienti veri. Se la costruisci prima, astrai le cose che immaginavi
cambiassero invece di quelle che cambiano davvero.

### Cosa si ripete e cosa no

Fra due siti vetrina fatti così, il **codice si ripete al 90%** e il
**contenuto allo 0%**. Il valore di un modello sta tutto nel tenere separate le
due cose — e in questo progetto la separazione è già tracciata, non per caso:

| Il contenuto (cambia sempre) | La macchina (non si tocca) |
|---|---|
| `src/lib/` — azienda, servizi, clienti, processo, percorso, testi legali | `src/components/` |
| `src/i18n/it.json` — ogni parola dell'interfaccia | `src/layouts/` |
| `src/content/progetti/` — i lavori | `src/scripts/` |
| `public/img/`, `public/fonts/`, `brand/` | `netlify/functions/` |
| `src/styles/global.css` — colori e caratteri | `scripts/` — i generatori e le verifiche |
| `astro.config.mjs` — il dominio | `tests/` |

È il motivo per cui in questo progetto **nessuna parola è scritta dentro un
componente**, e c'è un controllo automatico (`npm run check:i18n`) che lo
impedisce. Sembrava pignoleria; è la cosa che rende il progetto copiabile.

### Come parte il cliente numero 2, in pratica

Una mattina, se i contenuti ci sono:

1. Su GitHub, dal repository del sito: **Use this template** → nome nuovo.
2. `git clone`, `npm install`, `npm run dev` — il sito di PROJECTUNE gira in locale.
3. Metti il PDF del marchio del cliente in `brand/` e lancia `npm run logo`:
   ne escono l'SVG e la favicon, ricavati dal vettoriale vero, non ridisegnati.
4. Cambia i colori e i caratteri in `src/styles/global.css` (le variabili in
   cima, il resto segue da solo). Il capitolo 6 spiega come.
5. Sostituisci i contenuti nei file della colonna di sinistra qui sopra.
6. Immagini e foto in `public/img/`.
7. `astro.config.mjs`: il dominio nuovo.
8. Lancia le verifiche: `npm run build && npm run check && npm test`, poi
   `check:pages`, `check:responsive`, `check:html`, `check:links`, `check:i18n`.
   Ti dicono se hai dimenticato qualcosa meglio di quanto te ne accorga tu.
9. Su Netlify: nuovo sito dal repository, variabili d'ambiente, dominio.
10. Consegna: capitolo 16, paragrafo «Chi possiede cosa».

### I temi: il moltiplicatore che hai già

Il sito ha due linee grafiche (capitolo 6, ricetta «Cambiare il vestito del
sito»): quella scura metallica e quella «foglio da disegno». Aggiungerne una
terza sono tre passi, tutti scritti nel `README`.

Per uno studio, questo cambia il modo di vendere. Con quattro o cinque temi in
libreria puoi far vedere a un cliente **il suo sito, con i suoi contenuti, in
tre vesti diverse, in un pomeriggio**, invece di discutere su bozze astratte. E
il cliente sceglie su qualcosa di vero, non su un'immagine.

Attenzione a una cosa: ogni tema in più è codice da mantenere. Cinque temi ben
fatti valgono più di quindici abbozzati.

### Gli account: le decisioni da prendere prima, non dopo

| Cosa | Meglio intestarlo a | Perché |
|---|---|---|
| **Dominio** | **Sempre al cliente** | Se è tuo, tecnicamente il suo sito è tuo. È un guaio legale e un pessimo modo di lavorare |
| **Casella email** | **Sempre al cliente** | Ci passano i contatti dei suoi clienti: sono dati suoi |
| **Repository GitHub** | Tuo, con il cliente come collaboratore — oppure suo, con te collaboratore | Il primo modo è più comodo finché lo mantieni tu; il secondo rende la separazione indolore |
| **Account Netlify** | Un *team* tuo, finché lo mantieni tu | Gestire venti account separati è ingestibile. Ma mettilo per iscritto: alla fine del rapporto il sito si trasferisce |
| **Chiavi dei servizi** (posta, antispam) | Al cliente, se ce la fa. Altrimenti tue, dichiarate | Sono a suo nome i messaggi che partono |

> **La clausola che ti salva.** Scrivi nel preventivo, in una riga: *«Alla
> cessazione del rapporto, dominio, repository e sito vengono trasferiti al
> committente entro X giorni»*. Costa nulla, e toglie dal tavolo l'unica
> discussione che avvelena davvero i rapporti con i clienti.

### I costi, man mano che si cresce

| | 1 sito | 5 siti | 20 siti |
|---|---|---|---|
| Domini (a carico del cliente) | 10–20 €/anno | 50–100 €/anno | 200–400 €/anno |
| Hosting (Netlify o Cloudflare, piano gratuito) | 0 € | 0 € | 0 €, ma controlla i minuti di build |
| GitHub | 0 € | 0 € | 0 € |
| Posta transazionale per i moduli | 0 € | 0 € | Probabilmente ancora 0 €, dipende dal volume |
| **Il costo vero** | **Il tuo tempo** | **Il tuo tempo** | **Il tuo tempo, e comincia a pesare** |

L'infrastruttura, praticamente, è gratis. È un argomento di vendita fortissimo
contro un WordPress in hosting condiviso — che parte da qualche decina di euro
l'anno *a sito* e va aggiornato ogni mese o si buca. Ma non raccontartela: il
costo di venti siti non è l'hosting, è la manutenzione.

### La manutenzione a venti siti: il problema vero

È qui che gli studi piccoli affogano, ed è bene saperlo prima. Venti siti
vogliono dire venti volte: librerie che invecchiano, versioni di Node che
cambiano, un fornitore che ridisegna il pannello, un certificato, un dominio in
scadenza.

Quattro cose che riducono il problema da ingestibile a mezza giornata al mese:

1. **Un rito fisso.** Il primo lunedì del mese: `npm update`, build, verifiche,
   push. Su un sito statico va liscio quasi sempre, perché le dipendenze sono
   quattro e sono tutte ufficiali.
2. **Dependabot attivo su ogni repository.** Gratis, una spunta: ti apre da solo
   una pull request quando una libreria ha un problema di sicurezza.
3. **Le verifiche automatiche su GitHub Actions.** Le quindici verifiche di
   questo progetto possono girare da sole a ogni push. Con venti siti non puoi
   ricordarti di lanciarle a mano; con Actions non devi.
4. **Un foglio con le scadenze.** Domini e certificati, con la data. Il modo più
   comune di perdere un sito non è un attacco informatico: è un rinnovo
   dimenticato.

### Dove il cliente scrive i suoi testi, quando i clienti sono tanti

Il capitolo 16 elenca le tre strade (lo fai tu / l'editor di GitHub / un CMS).
Con molti clienti la scelta cambia di peso: **fare tu le modifiche a venti
clienti non scala**. Le due opzioni serie diventano:

- **Decap CMS o Sveltia CMS** — gratuiti, vivono dentro il sito stesso, scrivono
  su Git. Il cliente entra da `iltuosito.it/admin`, vede un modulo, salva, e
  sotto succede un commit che fa ripartire la pubblicazione. Costo: mezza
  giornata di configurazione **per modello** (non per cliente, se lo metti nel
  modello), e resta gratis. È la strada giusta.
- **Un CMS ospitato** (Sanity, Storyblok, Contentful) — più curati, più
  potenti, con piani gratuiti limitati e poi a pagamento **per sito**. Hanno
  senso se il cliente ha una redazione vera.

Qualunque cosa scegli, ricordati che **un CMS è una cosa in più da mantenere**:
aggiungerlo a un sito che cambia due volte l'anno è lavoro sprecato.

### Il modello di servizio, in due righe

Quello che funziona per siti così, ed è onesto verso tutti e due:

- **Un compenso di impianto** per costruirlo — la parte grossa.
- **Un canone annuale di manutenzione**, che dichiara cosa comprende: le
  passate di aggiornamento, N modifiche ai testi, il controllo delle scadenze,
  il tempo di risposta se qualcosa si rompe.
- **Fuori dal canone**, a preventivo: pagine nuove, restyling, funzioni nuove.

Il canone non è un modo di far pagare l'aria: un sito senza manutenzione, dopo
tre anni, è un sito che nessuno sa più ricostruire. Il tuo, fra l'altro, ha
`README`, `PLAN`, `RESULTS` e questa guida scritti apposta perché quel momento
arrivi il più tardi possibile — e perché, se arriva, chiunque ci possa mettere
le mani.

---

*Questa guida sta in `GUIDA.md`, nel repository, e viene versionata insieme al
codice che descrive: se il sito cambia, la guida si aggiorna qui.*
