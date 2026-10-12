import { readFile, writeFile, rename, mkdir, readdir, unlink, lstat, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { parse } from 'yaml';

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const asset = /^\/uploads\/admin\/[a-f0-9-]+\.(?:png|jpg|webp|gif|svg|stl)$/;
async function optional(file) { try { return await readFile(file,'utf8'); } catch(e) { if(e.code==='ENOENT')return null;throw e; } }
async function atomic(file,text) {
  // Astro may hold its config open on Windows without rename sharing. Its
  // small config is written in place; the transaction retains a rollback copy.
  if(path.basename(file)==='content.config.ts'){await writeFile(file,text);return;}
  const temp=`${file}.${randomUUID()}.tmp`;await writeFile(temp,text);
  try {
    for(let attempt=0;;attempt++){
      try{await rename(temp,file);return;}
      catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code) || attempt>=12)throw error;await new Promise(resolve=>setTimeout(resolve,100));}
    }
  } finally {await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
export function createSiteStore(root, loadModules, onApplied = async()=>{}) {
  const privateDir=path.join(root,'.admin-local');
  const projectDir=path.join(root,'src','content','progetti');
  const clientsFile=path.join(root,'src','lib','committenti.ts');
  const configFile=path.join(root,'src','content.config.ts');
  const uploadDir=path.join(root,'public','uploads','admin');
  const baselineFile=path.join(privateDir,'site-baseline.json');
  const stateFile=path.join(privateDir,'site-state.json');
  let ready; let baseline; let record; let queue=Promise.resolve();
  const target=name=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name))throw Error('Nome file progetto non valido.');return path.join(projectDir,name);};
  async function ensure() {
    if(!ready)ready=(async()=>{
      for(const directory of [projectDir,path.dirname(clientsFile)])if((await lstat(directory)).isSymbolicLink())throw Error('Le cartelle dei contenuti non possono essere collegamenti simbolici.');
      await mkdir(privateDir,{recursive:true});await mkdir(uploadDir,{recursive:true});
      const actualRoot=await realpath(root);
      for(const directory of [privateDir,projectDir,path.dirname(clientsFile),uploadDir])if(!(await realpath(directory)).startsWith(actualRoot+path.sep))throw Error('Cartella contenuti esterna al progetto.');
      if((await lstat(configFile)).isSymbolicLink())throw Error('La configurazione non può essere un collegamento simbolico.');
      if((await lstat(uploadDir)).isSymbolicLink())throw Error('La cartella upload non può essere un collegamento simbolico.');
      const saved=await optional(baselineFile);
      if(saved)baseline=JSON.parse(saved);
      else {
        const {committenti,creaSchemaProgetto}=await loadModules();
        const schema=creaSchemaProgetto(committenti.map(c=>c.id));const files={};const progetti=[];
        for(const name of await readdir(projectDir))if(name.endsWith('.md')){
          const text=await readFile(target(name),'utf8');files[name]=text;
          const match=text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
          if(!match)throw Error(`Frontmatter non valido: ${name}`);
          progetti.push({id:name.slice(0,-3),data:schema.parse(parse(match[1])),body:match[2],stato:'pubblicato'});
        }
        const state={progetti,committenti,pubblicati:structuredClone(progetti)};
        baseline={createdAt:new Date().toISOString(),clientsSource:await readFile(clientsFile,'utf8'),files,uploads:await readdir(uploadDir),state};
        await writeFile(baselineFile,JSON.stringify(baseline),{flag:'wx'});
      }
      const savedState=await optional(stateFile);
      if(!baseline.configSource){baseline.configSource=await readFile(configFile,'utf8');await atomic(baselineFile,JSON.stringify(baseline));}
      record=savedState ? JSON.parse(savedState) : {revision:0,state:baseline.state,files:baseline.files,clientsSource:baseline.clientsSource};
      record.configSource ??= baseline.configSource;
      if(!savedState)await atomic(stateFile,JSON.stringify(record));
    })();
    return ready;
  }
  async function validate(state) {
    const localAsset=value=>{if(typeof value!=='string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))return false;try{return !decodeURIComponent(value).split('/').includes('..');}catch{return false;}};
    if(!state || !Array.isArray(state.committenti) || !state.committenti.length || state.committenti.length>1000 || !Array.isArray(state.progetti) || !Array.isArray(state.pubblicati))throw Error('Archivio contenuti non valido.');
    const clients=state.committenti.map(c=>{
      if(!c || !slug.test(c.id) || typeof c.nome!=='string' || !c.nome.trim() || c.nome.length>200 || typeof c.visibile!=='boolean' || typeof c.inHome!=='boolean' || (c.inHome && !c.visibile))throw Error('Committente non valido.');
      if(Object.keys(c).some(k=>!['id','nome','logo','logoAlt','sito','visibile','inHome'].includes(k)))throw Error('Campi committente non ammessi.');
      if(c.logo && !localAsset(c.logo))throw Error('Logo non valido.');
      if(c.logoAlt!==undefined && typeof c.logoAlt!=='string')throw Error('Testo alternativo non valido.');
      if(c.sito && !/^https?:\/\/[^\s]+$/.test(c.sito))throw Error('Sito committente non valido.');
      return c;
    });
    if(new Set(clients.map(c=>c.id)).size!==clients.length || clients.filter(c=>c.inHome).length>7)throw Error('Identificativi duplicati o più di 7 committenti in home.');
    const {creaSchemaProgetto}=await loadModules();const schema=creaSchemaProgetto(clients.map(c=>c.id));
    const projects=(list,published)=>{
      if(list.length>1000)throw Error('Troppi progetti.');
      const checked=list.map(p=>{
        if(!p || !slug.test(p.id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(p.id) || typeof p.body!=='string' || p.body.length>200000 || !['bozza','pubblicato'].includes(p.stato) || (published && p.stato!=='pubblicato'))throw Error('Progetto non valido.');
        const data=schema.parse(p.data);
        if((data.immagine && !localAsset(data.immagine)) || data.disegni?.some(d=>!localAsset(d.file) || (d.anteprima && !localAsset(d.anteprima))))throw Error('Percorso immagine o allegato non valido.');
        if(published && /<\/?[a-z][^>]*>|\]\(\s*(?:javascript|data):/i.test(p.body))throw Error('Per pubblicare usa Markdown senza HTML o collegamenti eseguibili.');
        return {id:p.id,data,body:p.body,stato:p.stato};
      });
      if(new Set(checked.map(p=>p.id)).size!==checked.length || checked.filter(p=>p.data.inEvidenza).length>3)throw Error('Identificativi duplicati o più di 3 progetti in home.');
      return checked;
    };
    const progetti=projects(state.progetti,false);const pubblicati=projects(state.pubblicati,true);
    if(pubblicati.some(p=>!progetti.some(d=>d.id===p.id)))throw Error('Un progetto pubblicato non può essere rimosso da questa operazione.');
    return {progetti,committenti:clients,pubblicati};
  }
  function sourceFiles(state) {
    const files={};
    for(const p of state.pubblicati){
      const original=baseline.state.pubblicati.find(s=>s.id===p.id);
      if(original && JSON.stringify(p)===JSON.stringify(original)){files[`${p.id}.md`]=baseline.files[`${p.id}.md`];continue;}
      const data={...p.data};if(data.data)data.data=new Date(data.data).toISOString().slice(0,10);
      files[`${p.id}.md`]=`---\n${JSON.stringify(data,null,2)}\n---\n${p.body}`;
    }
    const clientsSource=JSON.stringify(state.committenti)===JSON.stringify(baseline.state.committenti) ? baseline.clientsSource : baseline.clientsSource.replace(/export const committenti: Committente\[\] = \[[\s\S]*?\n\];/,`export const committenti: Committente[] = ${JSON.stringify(state.committenti,null,2)};`);
    return {files,clientsSource};
  }
  async function apply(next,reset=false) {
    const names=new Set([...Object.keys(record.files),...Object.keys(next.files)]);const before={};
    const clientsBefore=await readFile(clientsFile,'utf8');
    const configBefore=await readFile(configFile,'utf8');
    if(!reset && clientsBefore!==record.clientsSource)throw Error('Anagrafica modificata fuori dall’admin. Ricarica o ripristina prima di salvare.');
    for(const name of names){before[name]=await optional(target(name));if(!reset && before[name] !== (record.files[name] ?? null))throw Error(`File modificato fuori dall’admin: ${name}`);}
    if(!reset && configBefore!==record.configSource)throw Error('Configurazione contenuti modificata fuori dall’admin.');
    const publicChanged=clientsBefore!==next.clientsSource || [...names].some(name=>before[name] !== (next.files[name] ?? null));
    next.configSource=reset ? baseline.configSource : publicChanged ? `${baseline.configSource.trimEnd()}\n// Aggiornamento contenuti admin locale: ${next.revision}\n` : configBefore;
    try {
      if(clientsBefore!==next.clientsSource)await atomic(clientsFile,next.clientsSource);
      for(const name of names){const text=next.files[name] ?? null;if(text===before[name])continue;if(text===null){if(before[name]!==null)await unlink(target(name));}else await atomic(target(name),text);}
      // Reload Astro's collection schema too, so newly created clients are valid
      // without restarting the dev server or invalidating the login session.
      if(configBefore!==next.configSource || reset)await atomic(configFile,next.configSource);
      if(publicChanged || reset)await onApplied(next,reset);
      await atomic(stateFile,JSON.stringify(next));record=next;
    } catch(error) {
      await atomic(clientsFile,clientsBefore);
      await atomic(configFile,configBefore);
      for(const name of names){if(before[name]===null){if(await optional(target(name))!==null)await unlink(target(name));}else await atomic(target(name),before[name]);}
      await onApplied(record,true);
      throw error;
    }
  }
  const run=fn=>{const work=queue.then(fn);queue=work.catch(()=>{});return work;};
  const response=()=>({revision:record.revision,state:record.state,baselineAt:baseline.createdAt,atBaseline:JSON.stringify(record.state)===JSON.stringify(baseline.state)});
  return {
    ensure,
    async get(){await ensure();await queue;return response();},
    upload(bytes,filename){return run(async()=>{await ensure();if(!asset.test(`/uploads/admin/${filename}`))throw Error('Nome upload non valido.');await writeFile(path.join(uploadDir,filename),bytes,{flag:'wx'});});},
    save(state,revision){return run(async()=>{await ensure();if(revision!==record.revision){const error=Error('Contenuti aggiornati in un’altra finestra. Ricarica prima di salvare.');error.status=409;throw error;}
      const checked=await validate(state);
      if(record.state.pubblicati.some(p=>!checked.pubblicati.some(n=>n.id===p.id)))throw Error('Non puoi cancellare una pubblicazione con questo comando.');
      await apply({revision:record.revision+1,state:checked,...sourceFiles(checked)});return response();
    });},
    reset(revision){return run(async()=>{await ensure();if(revision!==record.revision){const error=Error('Contenuti aggiornati altrove. Ricarica prima del reset.');error.status=409;throw error;}
      await apply({revision:record.revision+1,state:structuredClone(baseline.state),files:baseline.files,clientsSource:baseline.clientsSource},true);
      // Delete only generated admin assets absent from the immutable baseline.
      for(const name of await readdir(uploadDir))if(!baseline.uploads.includes(name) && asset.test(`/uploads/admin/${name}`))await unlink(path.join(uploadDir,name));
      return response();
    });},
  };
}

export function siteMiddleware(store) {
  return async(req,res)=>{
    const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
    try {
      if(req.method==='GET')return reply(200,await store.get());
      if(req.method!=='POST')return reply(405,{error:'Metodo non consentito.'});
      if(req.headers.origin!==`http://${req.headers.host}` || req.headers['x-projectune-admin']!=='local-site')return reply(403,{error:'Origine non valida.'});
      let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024)return reply(413,{error:'Archivio troppo grande.'});chunks.push(chunk);}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result=body.action==='reset' ? await store.reset(body.revision) : body.action==='save' ? await store.save(body.state,body.revision) : null;
      if(!result)return reply(400,{error:'Operazione non valida.'});reply(200,result);
    } catch(error){reply(error.status ?? 400,{error:error.message ?? 'Operazione non riuscita.'});}
  };
}
