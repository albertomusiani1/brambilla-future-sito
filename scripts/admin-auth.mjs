import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
export const SESSION_SECONDS = 60;

export function createAuth(directory) {
  const sessions = new Map();
  const presences = new Map();
  const failures = new Map();
  const filename = path.join(directory,'credentials.json');
  let credentials;
  const hash = (password,salt) => scryptSync(password,salt,64).toString('hex');
  const make = (username,password) => { const salt=randomBytes(32).toString('hex'); return {username,salt,hash:hash(password,salt)}; };
  async function save(value) {
    await mkdir(directory,{recursive:true});
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary,JSON.stringify(value),{mode:0o600});
    await rename(temporary,filename);
  }
  async function load() {
    if (!credentials) credentials = (async () => {
      try { const value = JSON.parse(await readFile(filename,'utf8')); if (typeof value.username !== 'string' || !/^[a-f0-9]{64}$/.test(value.salt) || !/^[a-f0-9]{128}$/.test(value.hash)) throw Error('Archivio credenziali non valido.'); return value; }
      catch (error) { if (error.code !== 'ENOENT') throw error; const value=make('admin','password'); await save(value); return value; }
    })();
    return credentials;
  }
  const verify = (password,value) => typeof password === 'string' && password.length <= 256 && timingSafeEqual(Buffer.from(hash(password,value.salt),'hex'),Buffer.from(value.hash,'hex'));
  const issue = () => { const token=randomBytes(32).toString('hex'); sessions.set(token,Date.now()+SESSION_SECONDS*1000); return token; };
  const valid=token=>sessions.has(token) && (sessions.get(token)>Date.now() || (presences.get(token)?.size ?? 0)>0);
  const revoke=token=>{sessions.delete(token);const listeners=[...(presences.get(token) ?? [])];presences.delete(token);listeners.forEach(close=>close());};
  function session(req) {
    const token = req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('projectune_admin='))?.slice('projectune_admin='.length);
    const expires = sessions.get(token);
    if (!expires || !valid(token)) { if (token) revoke(token); return undefined; }
    return token;
  }
  return {
    session,
    keepAlive(token,onRevoked) {
      if(!valid(token))throw Error('Sessione scaduta.');
      if(!presences.has(token))presences.set(token,new Set());
      presences.get(token).add(onRevoked);
      let released=false;
      return ()=>{if(released)return;released=true;const listeners=presences.get(token);listeners?.delete(onRevoked);if(!listeners?.size){presences.delete(token);if(sessions.has(token))sessions.set(token,Date.now()+SESSION_SECONDS*1000);}};
    },
    async login(username,password,address) {
      const attempts=failures.get(address);
      if (attempts && attempts.until > Date.now() && attempts.count >= 5) return {status:429,error:'Troppi tentativi. Riprova fra 10 minuti.'};
      const value=await load();
      const matches=verify(password,value);
      if (username !== value.username || !matches) {
        const attempt=attempts?.until > Date.now() ? attempts : {count:0,until:Date.now()+10*60*1000}; attempt.count++; failures.set(address,attempt);
        return {status:401,error:'Username o password non corretti.'};
      }
      failures.delete(address); return {status:200,token:issue(),username:value.username};
    },
    async username() { return (await load()).username; },
    logout(token) { revoke(token); },
    async change(token,currentPassword,username,password) {
      if (!valid(token)) {revoke(token);return {status:401,error:'Accedi nuovamente.'};}
      const value=await load();
      if (!verify(currentPassword,value)) return {status:400,error:'Password attuale non corretta.'};
      if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,50}$/.test(username) || typeof password !== 'string' || password.length < 8 || password.length > 256) return {status:400,error:'Username: 3–50 lettere, numeri, punti o trattini. Password: 8–256 caratteri.'};
      const next=make(username,password); await save(next); credentials=Promise.resolve(next);[...sessions.keys()].forEach(revoke);
      return {status:200,token:issue(),username};
    },
  };
}

export function authMiddleware(auth) {
  return async (req,res,next) => {
    let route;
    try { route=path.posix.normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname).replaceAll('\\','/')); } catch { res.statusCode=400; return res.end(); }
    if (!/^\/admin(?:\/|$)/.test(route) && !route.startsWith('/__admin/')) return next();
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    const json=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    const redirect=()=>{res.statusCode=302;res.setHeader('Location','/admin');res.end();};
    const cookie=(token)=>res.setHeader('Set-Cookie',`projectune_admin=${token}; HttpOnly; SameSite=Strict; Path=/${token ? '' : '; Max-Age=0'}`);
    let origin;
    try { origin=new URL(`http://${req.headers.host}`); } catch { return json(403,{error:'Host non valido.'}); }
    if (!['localhost','127.0.0.1','[::1]'].includes(origin.hostname) || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) return json(403,{error:'Area disponibile solo sul server locale.'});
    const token=auth.session(req);
    if (route === '/admin' || route === '/admin/') return next();
    if (!route.startsWith('/__admin/auth/')) return token ? next() : route.startsWith('/__admin/') ? json(401,{error:'Sessione scaduta. Accedi nuovamente.'}) : redirect();
    try {
      if (route === '/__admin/auth/session' && req.method === 'GET') return token ? json(200,{username:await auth.username()}) : json(401,{error:'Accesso richiesto.'});
      if(route==='/__admin/auth/presence' && req.method==='GET') {
        if(!token)return json(401,{error:'Accesso richiesto.'});
        res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-store, no-transform');res.setHeader('X-Accel-Buffering','no');
        const release=auth.keepAlive(token,()=>{if(!res.writableEnded){res.write('event: revoked\ndata: {}\n\n');res.end();}});
        res.write('event: ready\ndata: {}\n\n');
        const interval=setInterval(()=>{if(!res.writableEnded)res.write(': keep-alive\n\n');},20000);
        res.on('close',()=>{clearInterval(interval);release();});return;
      }
      if (req.method !== 'POST') return json(405,{error:'Metodo non consentito.'});
      if (req.headers.origin !== origin.origin || req.headers['x-projectune-admin'] !== 'local-auth') return json(403,{error:'Origine non valida.'});
      if (route !== '/__admin/auth/login' && !token) return json(401,{error:'Accedi nuovamente.'});
      let size=0; const chunks=[];
      for await (const chunk of req) { size+=chunk.length; if (size > 8192) return json(413,{error:'Richiesta troppo grande.'}); chunks.push(chunk); }
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      if (route === '/__admin/auth/login') { const result=await auth.login(body.username,body.password,req.socket.remoteAddress); if (result.token) cookie(result.token); return json(result.status,result.token ? {username:result.username} : {error:result.error}); }
      if (route === '/__admin/auth/logout') { auth.logout(token); cookie(''); return json(200,{ok:true}); }
      if (route === '/__admin/auth/credentials') { const result=await auth.change(token,body.currentPassword,body.username,body.password); if (result.token) cookie(result.token); return json(result.status,result.token ? {username:result.username} : {error:result.error}); }
      return json(404,{error:'Operazione non disponibile.'});
    } catch { json(400,{error:'Operazione non riuscita. Verifica i dati e riprova.'}); }
  };
}
