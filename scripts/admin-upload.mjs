// Development-only local file storage. This plugin is never mounted in production.
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { parse } from 'devalue';
import { createAuth, authMiddleware } from './admin-auth.mjs';
import { createSiteStore, siteMiddleware } from './admin-site.mjs';
import { contentFingerprint } from '../src/lib/local-site-status.ts';

const LIMIT = 20 * 1024 * 1024;
const local = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);
export function validateUpload(bytes, filename, kind) {
  const extension = path.extname(filename).toLowerCase();
  const image = kind === 'image' || kind === 'drawing';
  if (!image && kind !== 'model') throw Error('Tipo di caricamento non valido.');
  if (!bytes.length || bytes.length > LIMIT) throw Error('Il file deve avere dimensione fra 1 byte e 20 MB.');
  const text = () => bytes.toString('utf8');
  if (image) {
    if (kind === 'drawing' && !['.svg', '.png'].includes(extension)) throw Error('Per i disegni 2D usa SVG o PNG.');
    let valid = false;
    if (extension === '.png') valid = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (['.jpg','.jpeg'].includes(extension)) valid = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (extension === '.webp') valid = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
    if (extension === '.gif') valid = /^GIF8[79]a/.test(bytes.toString('ascii',0,6));
    if (extension === '.svg') {
      const svg = text();
      // Reject active XML, external resources and embedded HTML. Static SVG only.
      valid = /^\s*(?:<\?xml[^>]*\?>\s*)?<svg[\s>]/i.test(svg) && /<\/svg>\s*$/.test(svg)
        && !/[&]|<!|<\?(?!xml)|<\s*(?:script|style|foreignObject|iframe|image|use|animate\w*|set|a|audio|video|feImage)\b|\bon\w+\s*=|\b(?:href|src|style)\s*=|url\s*\(|@import|javascript:|data:/i.test(svg);
    }
    if (!valid) throw Error('Formato immagine non valido o SVG con risorse attive/esterne. Usa PNG, JPEG, WebP, GIF o SVG statico.');
  } else {
    if (extension !== '.stl') throw Error('Per i modelli 3D usa il formato STL.');
    const binary = bytes.length >= 84 && bytes.length === 84 + bytes.readUInt32LE(80) * 50;
    const ascii = /^\s*solid\b/i.test(text()) && /\bendsolid\b/i.test(text()) && /\bfacet\s+normal\b/i.test(text()) && /\bvertex\s+[-+\d.]/i.test(text());
    if (!binary && !ascii) throw Error('Il file non contiene un modello STL valido.');
  }
  return extension === '.jpeg' ? '.jpg' : extension;
}

export default function adminUpload() {
  return {
    name: 'projectune-local-admin-upload',
    apply: 'serve',
    configureServer(server) {
      // Use Astro's live environment, not Vite's legacy compatibility runner:
      // its content snapshots can stay stale after a reset.
      const importModule=id=>server.environments.ssr.runner.import(id);
      const store=createSiteStore(server.config.root,async()=>{
        const clients=await importModule(path.join(server.config.root,'src/lib/committenti.ts'));
        const schema=await importModule(path.join(server.config.root,'src/lib/schema-progetto.ts'));
        return {...clients,...schema};
      },async next=>{
        const expected=contentFingerprint(next.state.pubblicati,next.state.committenti);
        const address=server.httpServer.address();
        if(!address || typeof address==='string')throw Error('Server locale non disponibile.');
        const url=`http://localhost:${address.port}/local-site-state/current.json`;
        let diagnostic;
        for(let attempt=0;attempt<100;attempt++){
          try {
            // Astro's static-page runner can retain a different data singleton
            // from SSR. Wait for the loader's persisted snapshot, then refresh
            // both live environments from that same completed snapshot.
            const map=parse(await readFile(path.join(server.config.root,'.astro/data-store.json'),'utf8'));
            const entries=[...(map.get('progetti')?.values() ?? [])];
            if(contentFingerprint(entries,next.state.committenti)===expected){
              for(const name of ['ssr','prerender']){
                const environment=server.environments[name];
                if(!environment?.runner)continue;
                const module=await environment.runner.import(path.join(server.config.root,'node_modules/astro/dist/content/data-store.js'));
                module.globalDataStore.set(await module.ImmutableDataStore.fromMap(map));
                environment.hot.send('astro:content-changed',{});
              }
            }
            const response=await fetch(url,{signal:AbortSignal.timeout(2000),cache:'no-store'});
            const actual=await response.json();diagnostic={status:response.status,expected,actual:actual.hash};
            if(response.ok && actual.hash===expected){
              server.environments.ssr.hot.send('astro:content-changed',{});
              server.ws.send({type:'custom',event:'projectune:site-updated',data:{revision:next.revision}});return;
            }
          } catch(error){diagnostic={error:error.message};}
          await new Promise(resolve=>setTimeout(resolve,50));
        }
        console.warn('[admin-sync]',diagnostic);
        throw Error('Astro non ha completato l’aggiornamento del sito. I file sono stati ripristinati; riprova.');
      });
      server.middlewares.use(authMiddleware(createAuth(path.join(server.config.root,'.admin-local'))));
      server.middlewares.use('/__admin/site',siteMiddleware(store));
      server.middlewares.use('/__admin/upload', async (req, res) => {
        const reply = (status, data) => { res.statusCode = status; res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(data)); };
        const host = req.headers.host ?? '';
        let origin;
        try { origin = new URL(`http://${host}`); } catch { return reply(403,{error:'Host non valido.'}); }
        const remote = req.socket.remoteAddress;
        if (!local(origin.hostname) || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote ?? '') || req.headers.origin !== origin.origin || req.headers['x-projectune-admin'] !== 'local-upload') return reply(403,{error:'Caricamento consentito solo dal prototipo sul server locale.'});
        if (req.method !== 'POST') return reply(405,{error:'Metodo non consentito.'});
        if (!req.headers['content-type']?.startsWith('multipart/form-data;')) return reply(415,{error:'Richiesto un caricamento multipart.'});
        const declared = Number(req.headers['content-length']);
        if (declared > LIMIT + 65536) return reply(413,{error:'File troppo grande: massimo 20 MB.'});
        try {
          const chunks = []; let size = 0;
          for await (const chunk of req) { size += chunk.length; if (size > LIMIT + 65536) return reply(413,{error:'File troppo grande: massimo 20 MB.'}); chunks.push(chunk); }
          const request = new Request(origin.origin, {method:'POST',headers:{'content-type':req.headers['content-type']},body:Buffer.concat(chunks)});
          const form = await request.formData(); const file = form.get('file');
          if (!(file instanceof File)) return reply(400,{error:'Seleziona un file.'});
          const bytes = Buffer.from(await file.arrayBuffer());
          const extension = validateUpload(bytes,file.name,String(form.get('kind')));
          const filename = `${randomUUID()}${extension}`;
          await store.upload(bytes,filename);
          reply(201,{path:`/uploads/admin/${filename}`,name:file.name,size:bytes.length});
        } catch (error) { reply(400,{error:error instanceof Error ? error.message : 'Caricamento non riuscito.'}); }
      });
    },
  };
}
