import assert from 'node:assert/strict';
import { test } from 'node:test';
import { committenti, committentiVisibili, trovaCommittente, ID_COMMITTENTI } from '../src/lib/committenti.ts';

test('visibilità globale nasconde il committente ma preserva i riferimenti dello schema',()=>{
  const hidden=committenti.find(c=>!c.visibile);
  assert.equal(trovaCommittente(hidden.id),undefined);
  assert.equal(committentiVisibili().some(c=>c.id===hidden.id),false);
  assert.ok(ID_COMMITTENTI.includes(hidden.id));
});
test('home richiede visibilità e selezione, con massimo sette committenti',()=>{
  const client=committenti[0];const original={...client};
  try {
    client.inHome=false;
    assert.ok(committentiVisibili().includes(client));
    assert.equal(committentiVisibili(true).includes(client),false);
    client.inHome=true;client.visibile=false;
    assert.equal(committentiVisibili(true).includes(client),false);
    assert.equal(trovaCommittente(client.id),undefined);
    assert.ok(committentiVisibili(true).length<=7);
  } finally {Object.assign(client,original);}
});
