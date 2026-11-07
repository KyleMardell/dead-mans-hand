const { test } = require('node:test');
const assert = require('node:assert/strict');
const U = require('../upgrades.js');

test('each upgrade maps to an existing PNG with its exact intrinsic dimensions', () => {
  const fs=require('node:fs'),path=require('node:path');
  const sources=new Set();
  for(const d of U.definitions){
    const data=fs.readFileSync(path.join(__dirname,'..',d.artwork.src));
    assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(data.readUInt32BE(16),d.artwork.width);assert.equal(data.readUInt32BE(20),d.artwork.height);
    assert.ok(d.artwork.width>d.artwork.height);assert.ok(Object.isFrozen(d.artwork));sources.add(d.artwork.src);
  }
  assert.equal(sources.size,6);
});

test('six central definitions expose every agreed level and unique Last Stand', () => {
  assert.equal(U.definitions.length,6);
  assert.equal(new Set(U.definitions.map(d=>d.id)).size,6);
  for(const d of U.definitions){assert.equal(d.levels.length,d.maxLevel);assert.ok(['Active','Passive'].includes(d.type));}
  assert.equal(U.get('last-stand').unique,true);assert.equal(U.get('last-stand').maxLevel,1);
  assert.deepEqual(U.get('quick-draw').levels,['Two discards per hand.','Three discards per hand.']);
});

test('offers sample distinct eligible upgrades uniformly without mutating ownership', () => {
  const collection={'quick-draw':1,'last-stand':1,'peek-ahead':2};
  const before=JSON.stringify(collection);
  assert.ok(U.eligible(collection).some(d=>d.id==='quick-draw'));
  assert.ok(!U.eligible(collection).some(d=>['last-stand','peek-ahead'].includes(d.id)));
  const eligible=U.eligible(collection);
  // Each equal-width random interval selects a different eligible first card.
  eligible.forEach((d,i)=>assert.equal(U.offer(collection,()=>(i+.5)/eligible.length)[0],d.id));
  const offers=U.offer(collection,()=>0);
  assert.equal(offers.length,3);assert.equal(new Set(offers).size,3);
  assert.equal(JSON.stringify(collection),before);
});

test('collection advances levels, rejects max levels and excludes exhausted pools', () => {
  let collection=U.collect({},'quick-draw');assert.equal(collection['quick-draw'],1);
  collection=U.collect(collection,'quick-draw');assert.equal(collection['quick-draw'],2);
  assert.throws(()=>U.collect(collection,'quick-draw'));
  collection=U.collect(collection,'last-stand');assert.throws(()=>U.collect(collection,'last-stand'));
  assert.throws(()=>U.collect(collection,'unknown'));
  const max=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));
  assert.deepEqual(U.offer(max),[]);
  delete max['quick-draw'];delete max['peek-ahead'];
  assert.equal(U.offer(max).length,2);
});
