import { getCollection } from 'astro:content';
import { committenti } from '../../lib/committenti';
import { contentFingerprint } from '../../lib/local-site-status';

// An opaque fingerprint, not data: read through the same pipeline as public
// pages. No route is generated in the production build.
export function getStaticPaths() {
  return import.meta.env.DEV ? [{params:{status:'current'}}] : [];
}
export async function GET() {
  if(!import.meta.env.DEV)return new Response(null,{status:404});
  const hash=contentFingerprint(await getCollection('progetti'),committenti);
  return Response.json({hash},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
