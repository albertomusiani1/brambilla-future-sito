import { creaSchemaProgetto } from '../lib/schema-progetto';
import type { Committente } from '../lib/committenti';
import { z } from 'astro/zod';

// Astro reloads public pages when Markdown/anagrafica change. Keep admin editors
// open: the server response refreshes their state without losing unsaved forms.
if(import.meta.hot)import.meta.hot.on('vite:beforeFullReload',payload=>{
  payload.path='/__admin_preserve_editor__.html';
});

type Data = z.infer<ReturnType<typeof creaSchemaProgetto>>;
type Project = { id: string; data: Data; body: string; stato: 'bozza' | 'pubblicato' };
type State = { progetti: Project[]; committenti: Committente[]; pubblicati?: Project[] };
const seed = document.querySelector<HTMLElement>('#admin-seed');
const closeHandlers = new Map<string, () => void>();
let pendingChoice: ((choice: string) => void) | undefined;
function ask(title: string, message: string, choices: [string,string][]): Promise<string> {
  const dialog = document.getElementById('conferma') as HTMLDialogElement;
  if (dialog.open) return Promise.resolve('cancel');
  document.getElementById('conferma-title')!.textContent=title;
  document.getElementById('conferma-message')!.textContent=message;
  const actions=document.getElementById('conferma-actions')!; actions.replaceChildren();
  for (const [value,label] of choices) {
    const button=document.createElement('button'); button.type='button'; button.textContent=label;
    button.onclick=()=>{ const resolve=pendingChoice; pendingChoice=undefined; dialog.close(); resolve?.(value); }; actions.append(button);
  }
  closeHandlers.set('conferma',()=>{ const resolve=pendingChoice; pendingChoice=undefined; dialog.close(); resolve?.('cancel'); });
  dialog.showModal();
  return new Promise(resolve=>{pendingChoice=resolve;});
}
async function authRequest(action: string, data: Record<string, unknown> = {}) {
  const response=await fetch(`/__admin/auth/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-Projectune-Admin':'local-auth'},body:JSON.stringify(data)});
  const result=await response.json(); if (!response.ok) throw Error(result.error ?? 'Operazione non riuscita.'); return result;
}
const login = document.querySelector<HTMLFormElement>('#login-form');
if (login) login.onsubmit=async e=>{
  e.preventDefault(); const button=login.querySelector<HTMLButtonElement>('button')!; button.disabled=true;
  try { const form=new FormData(login); await authRequest('login',{username:form.get('username'),password:form.get('password')}); location.assign('/admin/dashboard'); }
  catch(error) { document.getElementById('login-error')!.textContent=(error as Error).message; }
  finally { button.disabled=false; }
};
async function siteRequest(action?: string,state?: State,revision?: number) {
  const response=await fetch('/__admin/site',action ? {method:'POST',headers:{'Content-Type':'application/json','X-Projectune-Admin':'local-site'},body:JSON.stringify({action,state,revision})} : {});
  const result=await response.json();if(!response.ok)throw Error(result.error ?? 'Salvataggio sul server locale non riuscito.');return result as {state:State;revision:number;baselineAt:string};
}
if (seed) void start(seed);
const period = document.querySelector<HTMLSelectElement>('#periodo');
if (period) period.onchange = () => {
  document.getElementById('analytics-status')!.textContent = `Analytics non configurato · ${period.value}. Nessun dato disponibile; nessun dato raccolto o inviato.`;
};

async function start(seed: HTMLElement) {
  const key = 'projectune-admin-prototipo-v1';
  // Preserve the browser-only prototype archive before switching to server data.
  try {const previous=localStorage.getItem(key);if(previous && !localStorage.getItem('projectune-admin-prima-del-server-v1'))localStorage.setItem('projectune-admin-prima-del-server-v1',previous);}catch{}
  const initial: State = JSON.parse(seed.dataset.seed!);
  let state: State = structuredClone(initial);
  let revision=0;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const pf = el<HTMLFormElement>('form-progetto');
  const cf = el<HTMLFormElement>('form-committente');
  let editing: string | undefined;
  let editingClient: string | undefined;
  let drag: string | undefined;
  let clientFromProject = false;
  let uploading = 0;
  const dirty = new Set<HTMLFormElement>();
  const feedback = (s: string) => { el('feedback').textContent = s; };
  const schema = () => creaSchemaProgetto(state.committenti.map(c => c.id) as [string, ...string[]]);
  const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const path = (s: string) => s.startsWith('/') && !s.startsWith('//') && !s.includes('\\');
  function clientError(c: Committente) {
    if (!slug.test(c.id) || !c.nome.trim() || typeof c.visibile !== 'boolean') return 'Identificativo, nome o visibilità non validi.';
    if (c.inHome !== undefined && typeof c.inHome !== 'boolean') return 'Selezione home non valida.';
    if (c.logo && !path(c.logo)) return 'Il logo richiede un percorso locale.';
    if (c.sito && !/^https?:\/\/[^\s]+$/.test(c.sito)) return 'Il sito deve essere un indirizzo HTTP o HTTPS.';
    return '';
  }
  try {const server=await siteRequest();state=server.state;revision=server.revision;}
  catch(error){feedback((error as Error).message);return;}
  // Keep a separate copy of the last publication; a draft must never replace it.
  if(!state.pubblicati){
    state.pubblicati=structuredClone(initial.progetti);
    state.progetti.filter(p=>p.stato==='pubblicato').forEach(p=>{
      const index=state.pubblicati!.findIndex(s=>s.id===p.id);
      if(index>=0)state.pubblicati![index]=structuredClone(p);else state.pubblicati!.push(structuredClone(p));
    });
  }
  const publishedVersion=(id?: string)=>state.pubblicati?.find(p=>p.id===id);
  // Upgrade saved browser data without losing projects or client references.
  let clientSlots=0; let adjusted=false;
  state.committenti.forEach(c=>{
    const selected=c.inHome ?? c.visibile;
    c.inHome=c.visibile && selected && clientSlots < 7;
    if(c.inHome)clientSlots++;
    if(selected && !c.inHome)adjusted=true;
  });
  let projectSlots=0;
  [...state.progetti].sort((a,b)=>(a.data.ordine ?? 99)-(b.data.ordine ?? 99)).forEach(p=>{if(p.data.inEvidenza){if(projectSlots < 3)projectSlots++;else{p.data.inEvidenza=false;adjusted=true;}}});
  if(adjusted)feedback('Le selezioni precedenti sono state adeguate ai limiti di 3 progetti e 7 committenti in home. Le schede sono state mantenute.');
  const projectCount = (except?: string) => state.progetti.filter(p=>p.id!==except && p.data.inEvidenza).length;
  const clientCount = (except?: string) => state.committenti.filter(c=>c.id!==except && c.visibile && c.inHome).length;
  let lastSaved=structuredClone(state);
  let lastSaveError='';
  async function persist(message: string,metadata=false) {
    lastSaveError='';
    if(projectCount()>3 || clientCount()>7 || state.committenti.some(c=>c.inHome && !c.visibile)){lastSaveError='Selezione non valida: massimo 3 progetti e 7 committenti visibili in home.';feedback(lastSaveError);return false;}
    if(metadata)state.pubblicati?.forEach(p=>{const current=state.progetti.find(d=>d.id===p.id);if(current){p.data.ordine=current.data.ordine;p.data.inEvidenza=current.data.inEvidenza;}});
    const controls=[...document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('button,input,select,textarea')].map(element=>({element,disabled:element.disabled}));
    controls.forEach(({element})=>{element.disabled=true;});el('workspace').setAttribute('aria-busy','true');
    try {const saved=await siteRequest('save',state,revision);state=saved.state;revision=saved.revision;lastSaved=structuredClone(state);try{localStorage.setItem(key,JSON.stringify(state));}catch{}feedback(message);return true;}
    catch(error){state=structuredClone(lastSaved);lastSaveError=(error as Error).message;feedback(lastSaveError);return false;}
    finally {controls.forEach(({element,disabled})=>{if(element.isConnected)element.disabled=disabled;});el('workspace').removeAttribute('aria-busy');}
  }
  const node = (tag: string, text?: string) => { const n = document.createElement(tag); if (text) n.textContent = text; return n; };
  function button(text: string, action: () => void) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = action; return b; }
  const sorted = () => [...state.progetti].sort((a,b) => (a.data.ordine ?? Number.MAX_SAFE_INTEGER) - (b.data.ordine ?? Number.MAX_SAFE_INTEGER) || (b.data.data ? new Date(b.data.data).getTime() : 0) - (a.data.data ? new Date(a.data.data).getTime() : 0));
  function render() {
    const selection = (pf.elements.namedItem('committente') as HTMLSelectElement).value;
    const select = el<HTMLSelectElement>('select-committente');
    select.replaceChildren(new Option('Non specificato', ''));
    state.committenti.forEach(c => select.add(new Option(c.nome, c.id)));
    select.add(new Option('+ Nuovo committente…', '__new__'));
    select.value = selection;
    el('lista-progetti').replaceChildren();
    sorted().forEach(p => {
      const row = node('div'); row.className = 'row';
      const title = node('span', p.data.titolo); title.className = 'title';
      const badge = node('span', p.stato === 'bozza' ? 'Bozza' : 'Pubblicato'); badge.className = 'badge';
      row.append(title, badge, button('Modifica', () => openProject(p)));
      el('lista-progetti').append(row);
    });
    el('lista-committenti').replaceChildren();
    state.committenti.forEach(c => {
      const row = node('div'); row.className = 'row'; const title = node('span', `${c.nome} · ${c.id}`); title.className = 'title';
      row.append(title, node('span',c.visibile ? (c.inHome ? 'Visibile · In home' : 'Visibile') : 'Nascosto'), button('Modifica', () => openClient(c)));
      el('lista-committenti').append(row);
    });
    renderOrder();
    renderClientOrder();
    syncProjectHome(); syncClientHome();
  }
  async function move(id: string, position: number) {
    const list = sorted(); const from = list.findIndex(p => p.id === id);
    if (from < 0 || !Number.isInteger(position) || position < 1 || position > list.length) { feedback('Posizione non valida.'); return; }
    const item = list.splice(from, 1)[0]!; list.splice(position - 1, 0, item);
    list.forEach((p, i) => { p.data.ordine = i + 1; });
    if (editing) (pf.elements.namedItem('ordine') as HTMLInputElement).value = String(state.progetti.find(p => p.id === editing)?.data.ordine ?? '');
    await persist('Ordine aggiornato sul sito locale.',true); render();
    el('lista-ordine').querySelector<HTMLButtonElement>(`button[data-project="${id}"]`)?.focus();
  }
  function renderOrder() {
    el('home-order-status').textContent=`Progetti in home: ${projectCount()}/3. Per selezionarne un altro, libera un posto.`;
    const list = sorted(); el('lista-ordine').replaceChildren();
    list.forEach((p, i) => {
      const row = node('div'); row.className = 'row'; row.draggable = true;
      row.ondragstart = e => { drag = p.id; e.dataTransfer?.setData('text/plain', p.id); };
      row.ondragover = e => e.preventDefault();
      row.ondrop = e => { e.preventDefault(); if (drag) move(drag, i + 1); drag = undefined; };
      row.ondragend = () => { drag = undefined; };
      const title = node('span', `${i + 1}. ${p.data.titolo}`); title.className = 'title';
      const up = button('Su', () => move(p.id, i)); up.disabled = i === 0; up.setAttribute('aria-label', `Sposta su ${p.data.titolo}`);
      const down = button('Giù', () => move(p.id, i + 2)); down.disabled = i === list.length - 1; down.setAttribute('aria-label', `Sposta giù ${p.data.titolo}`);
      const label = node('label', 'Posizione'); const input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = String(list.length); input.step = '1'; input.value = String(i + 1); input.setAttribute('aria-label', `Posizione di ${p.data.titolo}`); label.append(input);
      const apply = button('Applica', () => move(p.id, Number(input.value)));
      apply.dataset.project = p.id;
      const home = document.createElement('input'); home.type = 'checkbox'; home.checked = p.data.inEvidenza;
      home.disabled=!home.checked && projectCount()>=3;
      home.onchange = async () => {p.data.inEvidenza=home.checked;await persist('Selezione home aggiornata sul sito locale.',true);if(editing===p.id)idField(pf,'inEvidenza').checked=state.progetti.find(d=>d.id===p.id)!.data.inEvidenza;renderOrder();syncProjectHome();};
      const homeLabel = node('label', 'In home'); homeLabel.className = 'check'; homeLabel.prepend(home);
      row.append(title, label, apply, up, down, homeLabel); el('lista-ordine').append(row);
    });
    const featured = state.progetti.filter(p => p.stato === 'pubblicato' && p.data.inEvidenza).sort((a,b) => (a.data.ordine ?? 99) - (b.data.ordine ?? 99)).slice(0,3);
    el('home-preview').replaceChildren(...featured.map(p => node('li', p.data.titolo)));
    if (!featured.length) el('home-preview').append(node('li', 'Nessun progetto pubblicato in evidenza.'));
  }
  async function moveClient(id: string, position: number) {
    const from = state.committenti.findIndex(c => c.id === id);
    if (from < 0 || !Number.isInteger(position) || position < 1 || position > state.committenti.length) { feedback('Posizione non valida.'); return; }
    const item = state.committenti.splice(from,1)[0]!; state.committenti.splice(position - 1,0,item);
    await persist('Ordine committenti aggiornato sul sito locale.'); render();
    el('lista-ordine-committenti').querySelector<HTMLButtonElement>(`button[data-client="${id}"]`)?.focus();
  }
  function renderClientOrder() {
    el('home-clients-order-status').textContent=`Committenti in home: ${clientCount()}/7. Solo i committenti visibili possono essere selezionati.`;
    el('lista-ordine-committenti').replaceChildren();
    state.committenti.forEach((c,i) => {
      const row = node('div'); row.className = 'row'; row.draggable = true;
      row.ondragstart = e => { drag = c.id; e.dataTransfer?.setData('text/plain',c.id); };
      row.ondragover = e => e.preventDefault();
      row.ondrop = e => { e.preventDefault(); if (drag) moveClient(drag,i+1); drag = undefined; };
      row.ondragend = () => { drag = undefined; };
      const title = node('span',`${i+1}. ${c.nome}`); title.className = 'title';
      const up = button('Su',() => moveClient(c.id,i)); up.disabled = i === 0; up.setAttribute('aria-label',`Sposta su ${c.nome}`);
      const down = button('Giù',() => moveClient(c.id,i+2)); down.disabled = i === state.committenti.length - 1; down.setAttribute('aria-label',`Sposta giù ${c.nome}`);
      const label = node('label','Posizione'); const input = document.createElement('input'); input.type='number'; input.min='1'; input.max=String(state.committenti.length); input.value=String(i+1); input.setAttribute('aria-label',`Posizione di ${c.nome}`); label.append(input);
      const apply = button('Applica',() => moveClient(c.id,Number(input.value))); apply.dataset.client = c.id;
      const visible=document.createElement('input');visible.type='checkbox';visible.checked=c.visibile;
      const home=document.createElement('input');home.type='checkbox';home.checked=c.inHome;home.disabled=!c.visibile || (!home.checked && clientCount()>=7);
      const saveVisibility=async()=>{
        const previous={visibile:c.visibile,inHome:c.inHome};c.visibile=visible.checked;c.inHome=c.visibile && home.checked;
        if(!await persist('Visibilità committente aggiornata sul sito locale.'))Object.assign(c,previous);
        if(editingClient===c.id){idField(cf,'visibile').checked=c.visibile;idField(cf,'inHome').checked=c.inHome;}
        render();
      };
      visible.onchange=saveVisibility;home.onchange=saveVisibility;
      const visibleLabel=node('label','Visibile nel sito');visibleLabel.className='check';visibleLabel.prepend(visible);
      const homeLabel=node('label','In home');homeLabel.className='check';homeLabel.prepend(home);
      row.append(title,label,apply,up,down,visibleLabel,homeLabel); el('lista-ordine-committenti').append(row);
    });
  }
  function openProject(p?: Project) {
    editing = p?.id; pf.reset(); el('disegni').replaceChildren(); el('errori-progetto').textContent = '';
    (pf.elements.namedItem('immagine') as HTMLInputElement).value = '';
    el('editor-title').textContent = p ? `Modifica · ${p.data.titolo}` : 'Nuovo progetto';
    el('editor-draft').hidden=p?.stato!=='bozza';
    const published=publishedVersion(p?.id);
    el('ripristina-pubblicato').hidden=p?.stato!=='bozza' || !published;
    el('draft-restore-help').hidden=p?.stato!=='bozza';
    el('draft-restore-help').textContent=published ? 'Puoi scartare la bozza e recuperare la versione pubblicata.' : 'Questo progetto non ha ancora una versione pubblicata da ripristinare.';
    const id = pf.elements.namedItem('id') as HTMLInputElement; id.value = p?.id ?? '';
    if (p) {
      Object.entries(p.data).forEach(([k,v]) => {
        const field = pf.elements.namedItem(k) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!field) return;
        if (k === 'inEvidenza') (field as HTMLInputElement).checked = !!v;
        else if (k === 'data') field.value = v ? new Date(v as string).toISOString().slice(0,10) : '';
        else field.value = Array.isArray(v) ? v.join('\n') : String(v ?? '');
      });
      (pf.elements.namedItem('body') as HTMLTextAreaElement).value = p.body;
      p.data.disegni?.forEach(d => addAttachment(d));
    }
    el('file-immagine').textContent = p?.data.immagine ? `Immagine presente: ${p.data.immagine.split('/').pop()}` : 'Nessuna immagine';
    thumbnail(el('thumb-immagine'),idField(pf,'immagine'),el<HTMLInputElement>('upload-immagine'),pf);
    syncProjectHome();
    dirty.delete(pf); el<HTMLDialogElement>('editor-progetto').showModal(); idField(pf,'titolo').focus();
  }
  function addAttachment(d?: NonNullable<Data['disegni']>[number]) {
    if (el('disegni').children.length >= 8) { feedback('Sono ammessi al massimo 8 allegati.'); return; }
    const box = node('fieldset'); box.className = 'attachment'; box.append(node('legend', 'Allegato'));
    const fields = node('div'); fields.className = 'fields';
    for (const [name, text] of [['titolo','Titolo'],['tipo','Tipo'],['file','Percorso file'],['anteprima','Percorso anteprima'],['nota','Nota']] as const) {
      if (name === 'file' || name === 'anteprima') {
        const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = name; hidden.value = d?.[name] ?? '';
        const label = node('label',name === 'file' ? 'Carica disegno o modello' : 'Carica immagine di anteprima');
        const upload = document.createElement('input'); upload.type = 'file'; upload.accept = name === 'file' ? '.svg,.png,.stl' : 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
        const status = node('p',hidden.value ? `File presente: ${hidden.value.split('/').pop()}` : 'Nessun file'); status.className='small';
        const thumb=node('div'); thumb.className='asset-preview'; thumbnail(thumb,hidden,upload,pf);
        upload.onchange = () => {
          const type = (fields.querySelector('[name=tipo]') as HTMLSelectElement).value;
          void uploadFile(upload,hidden,status, name === 'anteprima' ? 'image' : type === 'modello3d' ? 'model' : 'drawing',pf,el('errori-progetto'),thumb);
        };
        label.append(upload,hidden,status); fields.append(label,thumb); continue;
      }
      const label = node('label',text); let input: HTMLInputElement | HTMLSelectElement;
      if (name === 'tipo') { input = document.createElement('select'); input.add(new Option('Disegno 2D','disegno2d')); input.add(new Option('Modello 3D','modello3d')); }
      else input = document.createElement('input');
      input.name = name; input.value = d?.[name] ?? (name === 'tipo' ? 'disegno2d' : '');
      if (name === 'tipo') input.onchange = () => {
        const file = fields.querySelector<HTMLInputElement>('input[name=file]');
        if (file) file.value = '';
        fields.querySelector('.asset-preview')?.replaceChildren();
        const status = fields.querySelector('p'); if (status) status.textContent = 'Nessun file: carica un allegato del tipo selezionato.';
      };
      label.append(input); fields.append(label);
    }
    box.append(fields, button('Rimuovi allegato', () => { box.remove(); dirty.add(pf); })); el('disegni').append(box);
  }
  function readProject(): Project {
    const f = new FormData(pf); const data: Record<string, unknown> = { inEvidenza: f.has('inEvidenza') };
    for (const k of ['titolo','descrizioneBreve','committente','categoria','data','immagine','immagineAlt']) { const v = String(f.get(k) ?? '').trim(); if (v) data[k] = v; }
    if (f.get('ordine')) data.ordine = Number(f.get('ordine'));
    const points = String(f.get('puntiChiave') ?? '').split('\n').map(s => s.trim()).filter(Boolean); if (points.length) data.puntiChiave = points;
    const drawings = [...el('disegni').querySelectorAll('fieldset')].map(box => {
      const d: Record<string,string> = {}; box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name],select[name]').forEach(input => { if (input.value.trim()) d[input.name] = input.value.trim(); }); return d;
    });
    if (drawings.length) data.disegni = drawings;
    const id = editing ?? makeId(String(f.get('titolo') ?? ''),state.progetti.map(p=>p.id));
    if(data.inEvidenza && projectCount(editing)>=3)throw Error('La home può mostrare al massimo 3 progetti. Deseleziona un altro progetto prima di aggiungerlo.');
    if (!slug.test(id)) throw Error('Identificativo non valido: usa lettere minuscole, numeri e trattini.');
    if (state.progetti.some(p => p.id === id && p.id !== editing)) throw Error('Identificativo progetto già esistente.');
    const result = schema().safeParse(data);
    if (!result.success) throw Error(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
    return { id, data: result.data, body: String(f.get('body') ?? ''), stato: 'bozza' };
  }
  async function saveProject(stato: Project['stato']): Promise<boolean> {
    if (uploading) { el('errori-progetto').textContent = 'Attendi il completamento dei caricamenti.'; return false; }
    if (!pf.reportValidity()) return false;
    try {
      const p = readProject(); p.stato = stato;
      const previous=structuredClone(state);
      if(stato==='pubblicato'){
        const publishedIndex=state.pubblicati!.findIndex(s=>s.id===p.id);
        if(publishedIndex>=0)state.pubblicati![publishedIndex]=structuredClone(p);else state.pubblicati!.push(structuredClone(p));
      }
      const index = state.progetti.findIndex(x => x.id === editing); if (index >= 0) state.progetti[index] = p; else state.progetti.push(p);
      if (!await persist(stato === 'bozza' ? 'Bozza salvata sul server locale.' : 'Progetto pubblicato su localhost.')) { state=previous; el('errori-progetto').textContent=lastSaveError || 'Salvataggio non riuscito. Riprova.'; return false; }
      editing = p.id; (pf.elements.namedItem('id') as HTMLInputElement).readOnly = true; dirty.delete(pf);
      el('errori-progetto').textContent = ''; render(); el<HTMLDialogElement>('editor-progetto').close(); return true;
    } catch (error) { el('errori-progetto').textContent = (error as Error).message; return false; }
  }
  async function publishProject() {
    if (!pf.reportValidity()) return;
    try { readProject(); } catch(error) { el('errori-progetto').textContent=(error as Error).message; return; }
    const choice=await ask('Pubblicare il progetto?','Sei sicuro di voler pubblicare?', [['publish','Pubblica'],['draft','Salva bozza'],['cancel','Annulla']]);
    if (choice === 'publish') await saveProject('pubblicato'); else if (choice === 'draft') await saveProject('bozza');
  }
  pf.onsubmit = e => {
    e.preventDefault();
    if ((e as SubmitEvent).submitter?.getAttribute('value') === 'pubblicato') void publishProject(); else saveProject('bozza');
  };
  el('ripristina-pubblicato').onclick=()=>{void (async()=>{
    if(uploading){el('errori-progetto').textContent='Attendi il completamento dei caricamenti.';return;}
    const published=publishedVersion(editing);if(!published)return;
    const choice=await ask('Ripristinare la versione pubblicata?','La bozza e le modifiche non salvate verranno scartate. Vuoi continuare?',[['restore','Ripristina e cancella bozza'],['cancel','Annulla']]);
    if(choice!=='restore')return;
    if(published.data.inEvidenza && projectCount(editing)>=3){el('errori-progetto').textContent='La versione pubblicata è in home. Libera prima un posto fra i 3 progetti nel popup di ordinamento, poi riprova il ripristino.';return;}
    const index=state.progetti.findIndex(p=>p.id===editing);if(index<0)return;
    const previous=structuredClone(state);const restored=structuredClone(published);state.progetti[index]=restored;
    if(!await persist('Versione pubblicata ripristinata. Bozza eliminata.')){state=previous;el('errori-progetto').textContent=`${lastSaveError} La bozza è stata mantenuta.`;return;}
    dirty.delete(pf);render();el<HTMLDialogElement>('editor-progetto').close();openProject(restored);
  })();};
  el('anteprima').onclick = () => {
    try {
      const p = readProject(); const content = el('preview-content'); content.replaceChildren(node('h3', p.data.titolo), node('p',p.data.descrizioneBreve));
      if (p.data.committente) {const client=state.committenti.find(c=>c.id===p.data.committente && c.visibile);if(client)content.append(node('p',client.nome));}
      if (p.data.puntiChiave) { const ul = node('ul'); ul.append(...p.data.puntiChiave.map(s => node('li',s))); content.append(ul); }
      if (p.data.immagine && path(p.data.immagine)) { const img = document.createElement('img'); img.src = p.data.immagine; img.alt = p.data.immagineAlt || p.data.titolo; content.append(img); }
      content.append(node('pre',p.body));
      p.data.disegni?.forEach(d => content.append(node('p', `${d.titolo} · ${d.tipo} · ${d.file}${d.anteprima ? ' · ' + d.anteprima : ''}${d.nota ? ' · ' + d.nota : ''}`)));
      el('errori-progetto').textContent = ''; el<HTMLDialogElement>('preview').showModal();
    } catch (error) { el('errori-progetto').textContent = (error as Error).message; }
  };
  el('chiudi-preview').onclick = () => el<HTMLDialogElement>('preview').close();
  function openClient(c?: Committente, fromProject = false) {
    clientFromProject = fromProject;
    editingClient = c?.id; cf.reset(); el('errori-committente').textContent = '';
    (cf.elements.namedItem('logo') as HTMLInputElement).value = '';
    (cf.elements.namedItem('id') as HTMLInputElement).value = c?.id ?? '';
    el('committente-title').textContent = c ? `Modifica · ${c.nome}` : 'Nuovo committente';
    (cf.elements.namedItem('id') as HTMLInputElement).readOnly = !!c;
    if (c) Object.entries(c).forEach(([k,v]) => { const field = cf.elements.namedItem(k) as HTMLInputElement; if (!field) return; if (k === 'visibile' || k === 'inHome') field.checked = !!v; else field.value = String(v ?? ''); });
    el('file-logo').textContent = c?.logo ? `Logo presente: ${c.logo.split('/').pop()}` : 'Nessun logo';
    thumbnail(el('thumb-logo'),idField(cf,'logo'),el<HTMLInputElement>('upload-logo'),cf);
    syncClientHome();
    dirty.delete(cf); el<HTMLDialogElement>('editor-committente').showModal(); idField(cf,'nome').focus();
  }
  async function saveClient(): Promise<boolean> {
    if (uploading) { el('errori-committente').textContent = 'Attendi il completamento dei caricamenti.'; return false; }
    if (!cf.reportValidity()) return false; const f = new FormData(cf);
    const c: Committente = { id: editingClient ?? makeId(String(f.get('nome') ?? ''),state.committenti.map(c=>c.id)), nome: String(f.get('nome')).trim(), visibile: f.has('visibile'), inHome:f.has('visibile') && f.has('inHome') };
    if(c.inHome && clientCount(editingClient)>=7){el('errori-committente').textContent='La home può mostrare al massimo 7 committenti. Deseleziona un altro committente prima di aggiungerlo.';return false;}
    for (const k of ['logo','logoAlt','sito'] as const) { const v = String(f.get(k) ?? '').trim(); if (v) c[k] = v; }
    const error = clientError(c) || (state.committenti.some(x => x.id === c.id && x.id !== editingClient) ? 'Identificativo già esistente.' : '');
    if (error) { el('errori-committente').textContent = error; return false; }
    const previous=structuredClone(state);
    const index = state.committenti.findIndex(x => x.id === editingClient); if (index >= 0) state.committenti[index] = c; else state.committenti.push(c);
    if (!await persist('Committente salvato sul sito locale e disponibile nei progetti.')) {state=previous; el('errori-committente').textContent=lastSaveError || 'Salvataggio non riuscito. Riprova.'; return false;}
    editingClient = c.id; (cf.elements.namedItem('id') as HTMLInputElement).readOnly = true; dirty.delete(cf);
    el('errori-committente').textContent = ''; render();
    if (clientFromProject) { el<HTMLSelectElement>('select-committente').value = c.id; dirty.add(pf); }
    el<HTMLDialogElement>('editor-committente').close(); return true;
  }
  cf.onsubmit = e => { e.preventDefault(); saveClient(); };
  function syncProjectHome() {
    const home=idField(pf,'inEvidenza');home.disabled=!home.checked && projectCount(editing)>=3;
    el('home-project-status').textContent=`Progetti in home: ${projectCount(editing)+(home.checked ? 1 : 0)}/3. ${home.disabled ? 'Limite raggiunto: libera un posto nel popup di ordinamento.' : 'Massimo 3 progetti.'}`;
  }
  function syncClientHome() {
    const visible=idField(cf,'visibile');const home=idField(cf,'inHome');if(!visible.checked)home.checked=false;
    home.disabled=!visible.checked || (!home.checked && clientCount(editingClient)>=7);
    el('home-client-status').textContent=`Committenti in home: ${clientCount(editingClient)+(home.checked ? 1 : 0)}/7. ${!visible.checked ? 'Attiva prima la visibilità nel sito.' : home.disabled ? 'Limite raggiunto: libera un posto nel popup di ordinamento.' : 'Massimo 7 committenti visibili.'}`;
  }
  idField(pf,'inEvidenza').onchange=syncProjectHome;
  idField(cf,'visibile').onchange=syncClientHome;idField(cf,'inHome').onchange=syncClientHome;
  pf.oninput = () => { dirty.add(pf); };
  cf.oninput = () => { dirty.add(cf); };
  window.addEventListener('beforeunload', e => { if (dirty.size) e.preventDefault(); });
  el('nuovo-progetto').onclick = () => openProject(); el('nuovo-committente').onclick = () => openClient();
  el('aggiungi-disegno').onclick = () => { addAttachment(); dirty.add(pf); };
  el('committente-dal-progetto').onclick = () => openClient(undefined,true);
  el<HTMLSelectElement>('select-committente').onchange = () => { if (el<HTMLSelectElement>('select-committente').value === '__new__') { el<HTMLSelectElement>('select-committente').value = ''; openClient(undefined,true); } };
  for (const [dialogId,form] of [['editor-progetto',pf],['editor-committente',cf]] as const) {
    const dialog = el<HTMLDialogElement>(dialogId);
    const close = async () => {
      if (uploading) { (form === pf ? el('errori-progetto') : el('errori-committente')).textContent='Attendi il completamento dei caricamenti.'; return; }
      if (!dirty.has(form)) { dialog.close(); return; }
      const choices: [string,string][] = form === pf ? [['publish','Pubblica'],['draft','Salva bozza'],['discard','Chiudi senza salvare'],['cancel','Continua a modificare']] : [['save','Salva committente'],['discard','Chiudi senza salvare'],['cancel','Continua a modificare']];
      const choice=await ask('Modifiche non salvate','Sicuro di voler chiudere senza salvare?',choices);
      if (choice === 'discard') { dirty.delete(form); dialog.close(); }
      else if (choice === 'publish') await publishProject();
      else if (choice === 'draft') saveProject('bozza');
      else if (choice === 'save') saveClient();
    };
    closeHandlers.set(dialogId,()=>{void close();});
  }
  for (const [buttonId,panelId] of [['ordine-progetti','ordine'],['ordine-committenti','riordino-committenti']] as const) {
    const dialog=el<HTMLDialogElement>(panelId);
    el(buttonId).onclick = () => {dialog.showModal(); el(buttonId).setAttribute('aria-expanded','true');};
    closeHandlers.set(panelId,()=>{dialog.close(); el(buttonId).setAttribute('aria-expanded','false');});
  }
  async function uploadFile(input: HTMLInputElement, hidden: HTMLInputElement, status: HTMLElement, kind: string, form: HTMLFormElement, errors: HTMLElement, thumb?: HTMLElement) {
    const file = input.files?.[0]; if (!file) return;
    uploading++; input.disabled = true; status.textContent = `Caricamento di ${file.name}…`; errors.textContent = '';
    try {
      if (file.size > 20 * 1024 * 1024) throw Error('File troppo grande: massimo 20 MB.');
      const body = new FormData(); body.append('file',file); body.append('kind',kind);
      const response = await fetch('/__admin/upload',{method:'POST',headers:{'X-Projectune-Admin':'local-upload'},body});
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? 'Caricamento non riuscito.');
      hidden.value = result.path; status.textContent = `${file.name} · salvato sul server locale`; dirty.add(form);
      if (thumb) thumbnail(thumb,hidden,input,form);
    } catch (error) { errors.textContent = (error as Error).message; status.textContent = hidden.value ? 'Il file precedente è stato mantenuto.' : 'Nessun file caricato.'; }
    finally { uploading--; input.disabled = false; input.value = ''; }
  }
  for (const [inputId,name,statusId,form,errorId] of [['upload-immagine','immagine','file-immagine',pf,'errori-progetto'],['upload-logo','logo','file-logo',cf,'errori-committente']] as const) {
    const input = el<HTMLInputElement>(inputId); const hidden = form.elements.namedItem(name) as HTMLInputElement;
    const thumb=el(`thumb-${name}`);
    input.onchange = () => { void uploadFile(input,hidden,el(statusId),'image',form,el(errorId),thumb); };
    el(`rimuovi-${name === 'immagine' ? 'immagine' : 'logo'}`).onclick = () => { if (uploading) return; hidden.value=''; el(statusId).textContent = 'Nessun file'; thumb.replaceChildren(); dirty.add(form); };
  }
  function idField(form: HTMLFormElement,name: string) {return form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;}
  function makeId(title: string,ids: string[]) {
    const base=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'') || 'contenuto';
    let id=base; let index=2; while (ids.includes(id)) id=`${base}-${index++}`; return id;
  }
  function thumbnail(container: HTMLElement,hidden: HTMLInputElement,input: HTMLInputElement,form: HTMLFormElement) {
    container.replaceChildren();
    if (!path(hidden.value) || !/\.(png|jpe?g|webp|gif|svg)$/i.test(hidden.value)) return;
    const image=document.createElement('img'); image.src=hidden.value; image.alt='Apri immagine caricata';
    const open=button('',()=>{
      const viewer=el<HTMLDialogElement>('asset-viewer'); el<HTMLImageElement>('asset-image').src=hidden.value;
      el<HTMLImageElement>('asset-image').alt='Immagine caricata';
      el('asset-replace').onclick=()=>{viewer.close();input.click();};
      el('asset-remove').onclick=()=>{hidden.value='';container.replaceChildren();dirty.add(form); const status=input.closest('label')?.parentElement?.querySelector('p'); if(status) status.textContent='Nessun file'; viewer.close();};
      viewer.showModal();
    }); open.className='thumbnail';open.setAttribute('aria-label','Apri immagine caricata');open.append(image); container.append(open);
  }
  render();
}

const credentialsForm=document.querySelector<HTMLFormElement>('#credentials-form');
if(credentialsForm){
  let presence: EventSource | undefined;
  const connect=()=>{
    presence?.close();presence=new EventSource('/__admin/auth/presence');
    presence.addEventListener('revoked',()=>{presence?.close();document.getElementById('feedback')!.textContent='Sessione chiusa. Accedi nuovamente per salvare.';});
  };
  connect();window.addEventListener('projectune:credentials-updated',connect);window.addEventListener('pagehide',()=>presence?.close());window.addEventListener('pageshow',event=>{if(event.persisted)connect();});
  window.addEventListener('focus',()=>{if(presence?.readyState===EventSource.CLOSED)connect();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible' && presence?.readyState===EventSource.CLOSED)connect();});
}
const resetButton=document.querySelector<HTMLButtonElement>('#reset-sito');
if(resetButton)resetButton.onclick=async()=>{
  const choice=await ask('Ripristinare il sito dopo le prove?','Verranno ripristinati i progetti e i committenti dello stato iniziale. Le bozze e i file caricati durante le prove saranno eliminati. Le credenziali restano invariate.',[['reset','Ripristina sito'],['cancel','Annulla']]);
  if(choice!=='reset')return;
  resetButton.disabled=true;
  try {const current=await siteRequest();await siteRequest('reset',undefined,current.revision);try{localStorage.removeItem('projectune-admin-prototipo-v1');}catch{}location.assign('/admin/progetti');}
  catch(error){document.getElementById('feedback')!.textContent=(error as Error).message;resetButton.disabled=false;}
};
if (credentialsForm) {
  let changed=false;
  credentialsForm.oninput=()=>{changed=true;};
  document.getElementById('apri-credenziali')!.onclick=async ()=>{
    try {
      const response=await fetch('/__admin/auth/session'); if (!response.ok) {location.assign('/admin');return;}
      const data=await response.json(); credentialsForm.reset(); (credentialsForm.elements.namedItem('username') as HTMLInputElement).value=data.username;
      document.getElementById('credentials-error')!.textContent=''; changed=false; (document.getElementById('credenziali') as HTMLDialogElement).showModal();
    } catch {document.getElementById('feedback')!.textContent='Impossibile aprire le credenziali.';}
  };
  credentialsForm.onsubmit=async e=>{
    e.preventDefault();const data=new FormData(credentialsForm);
    if(data.get('password') !== data.get('repeat')) {document.getElementById('credentials-error')!.textContent='Le nuove password non coincidono.';return;}
    const button=credentialsForm.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;
    try {await authRequest('credentials',{currentPassword:data.get('currentPassword'),username:data.get('username'),password:data.get('password')});window.dispatchEvent(new Event('projectune:credentials-updated')); changed=false; credentialsForm.reset();(document.getElementById('credenziali') as HTMLDialogElement).close();document.getElementById('feedback')!.textContent='Credenziali aggiornate.';}
    catch(error) {document.getElementById('credentials-error')!.textContent=(error as Error).message;}finally{button.disabled=false;}
  };
  closeHandlers.set('credenziali',()=>{void (async()=>{
    if(changed){const choice=await ask('Modifiche non salvate','Chiudere senza aggiornare le credenziali?',[['save','Salva'],['discard','Chiudi senza salvare'],['cancel','Continua a modificare']]);if(choice==='save'){credentialsForm.requestSubmit();return;}if(choice!=='discard')return;}
    changed=false;credentialsForm.reset();(document.getElementById('credenziali') as HTMLDialogElement).close();
  })();});
  document.getElementById('logout')!.onclick=async()=>{try{await authRequest('logout');location.assign('/admin');}catch(error){document.getElementById('feedback')!.textContent=(error as Error).message;}};
}
for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog')) {
  const close=()=>{const handler=closeHandlers.get(dialog.id); if(handler)handler();else dialog.close();};
  dialog.querySelectorAll<HTMLButtonElement>(`[data-close="${dialog.id}"]`).forEach(button=>{button.onclick=close;});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  let outside=false;
  const out=(e: MouseEvent)=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',e=>{outside=e.target===dialog && out(e);});
  dialog.addEventListener('click',e=>{if(outside && e.target===dialog && out(e))close();outside=false;});
}
