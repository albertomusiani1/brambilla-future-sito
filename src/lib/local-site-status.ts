import { createHash } from 'node:crypto';

function stable(value: unknown): unknown {
  if(value instanceof Date)return value.toISOString();
  if(Array.isArray(value))return value.map(stable);
  if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable((value as Record<string,unknown>)[key])]));
  return value;
}
export function contentFingerprint(projects: {id:string;data:unknown;body?:string}[], clients: unknown): string {
  const progetti=[...projects].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>({id:p.id,data:stable(p.data),body:(p.body ?? '').trim()}));
  return createHash('sha256').update(JSON.stringify({progetti,committenti:stable(clients)})).digest('hex');
}
