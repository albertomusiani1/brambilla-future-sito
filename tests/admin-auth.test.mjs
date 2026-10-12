import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { createAuth, authMiddleware, SESSION_SECONDS } from '../scripts/admin-auth.mjs';
import { mkdir } from 'node:fs/promises';

test('login server, hash persistente, cambio credenziali, revoca sessioni e logout', async () => {
  await mkdir('reports',{recursive:true});
  const directory=await mkdtemp(path.resolve('reports','auth-test-'));
  try {
    const auth=createAuth(directory);
    assert.equal((await auth.login('admin','errata','test')).status,401);
    const first=await auth.login('admin','password','test'); assert.equal(first.status,200);
    const req={headers:{cookie:`projectune_admin=${first.token}`}};
    assert.equal(auth.session(req),first.token);
    const second=await auth.login('admin','password','test');
    assert.equal((await auth.change(first.token,'errata','giorgio','password-nuova')).status,400);
    assert.equal((await auth.change(first.token,'password','g','corta')).status,400);
    const changed=await auth.change(first.token,'password','giorgio','password-nuova'); assert.equal(changed.status,200);
    assert.equal(auth.session(req),undefined);
    assert.equal(auth.session({headers:{cookie:`projectune_admin=${second.token}`}}),undefined);
    assert.equal(auth.session({headers:{cookie:`projectune_admin=${changed.token}`}}),changed.token);
    const disk=await readFile(path.join(directory,'credentials.json'),'utf8');
    assert.equal(disk.includes('password-nuova'),false); assert.equal(disk.includes('password"'),false);
    const restarted=createAuth(directory);
    assert.equal((await restarted.login('admin','password','test')).status,401);
    const fresh=await restarted.login('giorgio','password-nuova','test'); assert.equal(fresh.status,200);
    restarted.logout(fresh.token); assert.equal(restarted.session({headers:{cookie:`projectune_admin=${fresh.token}`}}),undefined);
    for(let i=0;i<5;i++) await restarted.login('giorgio','errata','attacker');
    assert.equal((await restarted.login('giorgio','password-nuova','attacker')).status,429);
    const middleware=authMiddleware(restarted);
    for (const url of ['/admin/progetti','/%61dmin/progetti','/admin%2Fdashboard']) {
      const headers={};let next=false;
      const res={setHeader:(k,v)=>headers[k]=v,end:()=>{},statusCode:200};
      await middleware({url,headers:{host:'localhost:4321'},socket:{remoteAddress:'127.0.0.1'}},res,()=>{next=true;});
      assert.equal(next,false);assert.equal(res.statusCode,302);assert.equal(headers.Location,'/admin');
    }
  } finally {await unlink(path.join(directory,'credentials.json'));await rmdir(directory);}
});

test('sessione di un minuto: scadenza esatta, nessun rinnovo e redirect server', async t => {
  await mkdir('reports',{recursive:true});
  const directory=await mkdtemp(path.resolve('reports','auth-expiry-'));
  t.mock.timers.enable({apis:['Date'],now:1000000});
  try {
    assert.equal(SESSION_SECONDS,60);
    const auth=createAuth(directory);
    const login=await auth.login('admin','password','test');
    const request={headers:{cookie:`projectune_admin=${login.token}`,host:'localhost:4321'},socket:{remoteAddress:'127.0.0.1'}};
    t.mock.timers.tick(59000);assert.equal(auth.session(request),login.token);
    t.mock.timers.tick(1000);
    const middleware=authMiddleware(auth);
    for(const url of ['/admin/progetti','/admin/dashboard']) {
      const headers={};let next=false;
      const res={setHeader:(k,v)=>headers[k]=v,end:()=>{},statusCode:200};
      await middleware({...request,url},res,()=>{next=true;});
      assert.equal(next,false);assert.equal(res.statusCode,302);assert.equal(headers.Location,'/admin');
    }
    assert.equal(auth.session(request),undefined);
    assert.equal((await auth.change(login.token,'password','giorgio','password-nuova')).status,401);
  } finally {t.mock.timers.reset();await unlink(path.join(directory,'credentials.json'));await rmdir(directory);}
});

test('la presenza di pagine admin tiene attiva la sessione, logout la revoca subito',async t=>{
  await mkdir('reports',{recursive:true});const directory=await mkdtemp(path.resolve('reports','auth-presence-'));
  t.mock.timers.enable({apis:['Date'],now:1000000});
  try {
    const auth=createAuth(directory);const login=await auth.login('admin','password','test');const req={headers:{cookie:`projectune_admin=${login.token}`}};
    let revoked=0;const first=auth.keepAlive(login.token,()=>{revoked++;});const second=auth.keepAlive(login.token,()=>{revoked++;});
    t.mock.timers.tick(24*60*60*1000);assert.equal(auth.session(req),login.token);
    first();t.mock.timers.tick(60000);assert.equal(auth.session(req),login.token,'another tab is still open');
    second();t.mock.timers.tick(59000);assert.equal(auth.session(req),login.token);t.mock.timers.tick(1000);assert.equal(auth.session(req),undefined);
    const next=await auth.login('admin','password','test');auth.keepAlive(next.token,()=>{revoked++;});auth.logout(next.token);
    assert.equal(auth.session({headers:{cookie:`projectune_admin=${next.token}`}}),undefined);assert.equal(revoked,1);
  } finally {t.mock.timers.reset();await unlink(path.join(directory,'credentials.json'));await rmdir(directory);}
});
