import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload } from '../scripts/admin-upload.mjs';
import { readFile } from 'node:fs/promises';

test('accetta immagini e modelli reali, assegna solo estensioni consentite', async () => {
  assert.equal(validateUpload(await readFile('public/modelli/puleggia-dentata.png'),'../../foto.png','image'),'.png');
  assert.equal(validateUpload(await readFile('public/modelli/puleggia-dentata.stl'),'modello.stl','model'),'.stl');
  assert.equal(validateUpload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>'),'logo.svg','image'),'.svg');
});
test('rifiuta file vuoti, eseguibili rinominati, tipi incoerenti e dimensioni eccessive', () => {
  for (const [bytes,name,kind] of [[Buffer.alloc(0),'foto.png','image'],[Buffer.from('MZ executable'),'foto.png','image'],[Buffer.from('<html>file</html>'),'file.html','image'],[Buffer.from('bad stl'),'file.stl','model'],[Buffer.from('GIF89a'),'file.gif','drawing'],[Buffer.alloc(20*1024*1024+1),'foto.png','image']]) assert.throws(()=>validateUpload(bytes,name,kind));
});
test('rifiuta SVG con script, eventi, risorse esterne e CSS anche codificato', () => {
  for (const content of ['<script>alert(1)</script>','<path onload="alert(1)"/>','<image href="https://example.invalid/foto"/>','<style>@\\69mport "https://example.invalid/style";</style>','<path style="fill:u&#114;l(https://example.invalid/a)"/>','<!DOCTYPE svg>','<foreignObject><div>HTML</div></foreignObject>']) assert.throws(()=>validateUpload(Buffer.from(`<svg>${content}</svg>`),'file.svg','image'));
});
