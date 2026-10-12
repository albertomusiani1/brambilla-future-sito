import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createSiteStore } from '../scripts/admin-site.mjs';
import { creaSchemaProgetto } from '../src/lib/schema-progetto.ts';
import { componiDescrizione, componiTitolo } from '../src/lib/seo.ts';

test('bozze private, pubblicazione, conflitti, validazione e reset esatto con upload',async()=>{
  const reports=path.resolve('reports');await mkdir(reports,{recursive:true});
  const root=await mkdtemp(path.join(reports,'site-test-'));
  assert.ok(root.startsWith(reports+path.sep));
  try {
    const clients=[{id:'cliente-base',nome:'Cliente base',visibile:true,inHome:true}];
    const source=`export const committenti: Committente[] = ${JSON.stringify(clients,null,2)};\n`;
    const markdown='---\ntitolo: Progetto originale\ndescrizioneBreve: Descrizione del progetto originale sufficientemente lunga.\ncommittente: cliente-base\n---\n\n## Contenuto originale\nTesto originale.\n';
    for(const directory of ['src/lib','src/content/progetti','public/uploads/admin','.admin-local'])await mkdir(path.join(root,directory),{recursive:true});
    await writeFile(path.join(root,'src/lib/committenti.ts'),source);
    await writeFile(path.join(root,'src/content.config.ts'),'// configurazione originale\n');
    await writeFile(path.join(root,'src/content/progetti/originale.md'),markdown);
    const originalAsset='11111111-1111-4111-8111-111111111111.png';
    await writeFile(path.join(root,'public/uploads/admin',originalAsset),'immagine originale');
    await writeFile(path.join(root,'.admin-local/credentials.json'),'credenziali preservate');
    const store=createSiteStore(root,async()=>({committenti:clients,creaSchemaProgetto}));
    let result=await store.get();assert.equal(result.atBaseline,true);
    const draft=structuredClone(result.state);draft.progetti[0].body='Solo in bozza';draft.progetti[0].stato='bozza';
    result=await store.save(draft,result.revision);
    assert.equal(await readFile(path.join(root,'src/content/progetti/originale.md'),'utf8'),markdown);
    const publish=structuredClone(result.state);
    publish.committenti.push({id:'nuovo-cliente',nome:'Nuovo cliente',visibile:true,inHome:false});
    const p={id:'nuovo-progetto',stato:'pubblicato',body:'## Lavoro nuovo\nTesto pubblicato.',data:{titolo:'Nuovo progetto',descrizioneBreve:'Descrizione nuova sufficientemente lunga.',committente:'nuovo-cliente',inEvidenza:false}};
    publish.progetti.push(p);publish.pubblicati.push(p);
    const stale=result.revision;result=await store.save(publish,result.revision);
    assert.match(await readFile(path.join(root,'src/content/progetti/nuovo-progetto.md'),'utf8'),/Testo pubblicato/);
    assert.match(await readFile(path.join(root,'src/lib/committenti.ts'),'utf8'),/nuovo-cliente/);
    await assert.rejects(store.save(result.state,stale),{status:409});
    const invalid=structuredClone(result.state);invalid.pubblicati[0].body='<script>alert(1)</script>';
    await assert.rejects(store.save(invalid,result.revision),/senza HTML/);
    assert.equal((await store.get()).revision,result.revision);
    const uploaded='22222222-2222-4222-8222-222222222222.png';
    await store.upload(Buffer.from('upload test'),uploaded);
    await assert.rejects(store.upload(Buffer.from('bad'),'../../outside.png'),/Nome upload/);
    const restarted=createSiteStore(root,async()=>({committenti:clients,creaSchemaProgetto}));
    assert.equal((await restarted.get()).state.progetti.length,2);
    await writeFile(path.join(root,'src/content/progetti/originale.md'),'modifica fuori dall’admin');
    await assert.rejects(restarted.save(result.state,result.revision),/fuori dall/);
    result=await restarted.reset(result.revision);assert.equal(result.atBaseline,true);
    assert.equal(await readFile(path.join(root,'src/content/progetti/originale.md'),'utf8'),markdown);
    assert.equal(await readFile(path.join(root,'src/lib/committenti.ts'),'utf8'),source);
    assert.equal(await readFile(path.join(root,'src/content.config.ts'),'utf8'),'// configurazione originale\n');
    assert.equal(await readFile(path.join(root,'.admin-local/credentials.json'),'utf8'),'credenziali preservate');
    assert.equal(await readFile(path.join(root,'public/uploads/admin',originalAsset),'utf8'),'immagine originale');
    await assert.rejects(readFile(path.join(root,'public/uploads/admin',uploaded)),{code:'ENOENT'});
    await assert.rejects(readFile(path.join(root,'src/content/progetti/nuovo-progetto.md')),{code:'ENOENT'});
    assert.equal(result.state.progetti[0].stato,'pubblicato');
  } finally {assert.ok(root.startsWith(reports+path.sep));await rm(root,{recursive:true,force:true});}
});
test('SEO accetta i limiti dello schema senza cambiare il titolo editoriale',()=>{
  for(const base of ['a'.repeat(20),'Un abstract breve ma valido.']){
    const description=componiDescrizione(base,'Lavoro realizzato da PROJECTUNE.','/test');assert.ok(description.length>=120 && description.length<=160);
  }
  assert.ok(componiTitolo('Un titolo di progetto lungo '.repeat(4),'/test').length<=60);
});

test('testo alternativo assente, vuoto o breve non blocca le immagini',()=>{
  const schema=creaSchemaProgetto(['cliente-base']);
  const data={titolo:'Progetto di prova',descrizioneBreve:'Descrizione sufficientemente lunga.',immagine:'/img/prova.png'};
  assert.ok(schema.safeParse(data).success);
  assert.ok(schema.safeParse({...data,immagineAlt:''}).success);
  assert.ok(schema.safeParse({...data,immagineAlt:'A'}).success);
});
