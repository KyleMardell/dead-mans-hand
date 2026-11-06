const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');

function setup(level=1) {
  const s=G.newEncounter(G.rng(12),{'read-the-table':level,'quick-draw':2,'lucky-break':2,'flexible-carry':2});
  const hand=[0,5,10,15,20];s.sides[1].hand=hand;
  s.sides[1].pile=G.deck().filter(c=>!hand.includes(c));
  G.commitBossPlay(s,[20,5,15]);return s;
}

test('each level reveals only ranks and positions of one or two distinct committed cards', () => {
  for(const level of [1,2]) for(const random of [()=>0,()=>.999]){
    const s=setup(level),before=JSON.stringify({...s,readTheTable:null});
    G.readTheTable(s,random);
    assert.equal(s.readTheTable.remaining,0);assert.equal(s.readTheTable.reveals.length,level);
    assert.equal(new Set(s.readTheTable.reveals.map(r=>r.position)).size,level);
    for(const r of s.readTheTable.reveals){
      assert.deepEqual(Object.keys(r).sort(),['position','rank']);
      const actual=s.sides[1].hand[r.position];assert.ok(s.bossCommitment.includes(actual));
      assert.equal(r.rank,G.ranks[Math.floor(actual/4)]);
    }
    assert.equal(JSON.stringify({...s,readTheTable:null}),before);
    const spent=JSON.stringify(s);assert.throws(()=>G.readTheTable(s));assert.equal(JSON.stringify(s),spent);
  }
});

test('two distinct committed cards may correctly reveal the same rank', () => {
  const s=G.newEncounter(G.rng(3),{'read-the-table':2});
  s.sides[1].hand=[20,21,22,0,5];s.sides[1].pile=G.deck().filter(c=>!s.sides[1].hand.includes(c));s.bossCommitment=null;G.commitBossPlay(s,[20,21,22]);
  G.readTheTable(s,()=>0);assert.deepEqual(s.readTheTable.reveals,[{position:0,rank:'A'},{position:1,rank:'A'}]);
});

test('a committed boss cannot discard, reroll or submit different showdown cards', () => {
  const s=setup(2),before=JSON.stringify(s);
  assert.ok(Object.isFrozen(s.bossCommitment));
  assert.deepEqual(G.aiTurn(s,1,G.policies.informed,()=>{throw Error('No new decision is allowed');}),[20,5,15]);
  assert.throws(()=>G.commitBossPlay(s,[0,5,10]));assert.throws(()=>G.discard(s,1,0));
  assert.throws(()=>G.reveal(s,[s.sides[0].hand.slice(0,3),[0,5,10]]));assert.equal(JSON.stringify(s),before);
  G.readTheTable(s,()=>0);const revealed=JSON.stringify(s.readTheTable.reveals);
  G.discard(s,0,s.sides[0].hand[0]);assert.equal(JSON.stringify(s.readTheTable.reveals),revealed);
  G.reveal(s,[s.sides[0].hand.slice(0,3),[15,20,5]]);assert.equal(s.phase,'reveal');
});

test('activation requires ownership, choose phase and an already committed decision', () => {
  const uncommitted=G.newEncounter(G.rng(2),{'read-the-table':2});
  const before=JSON.stringify(uncommitted);assert.throws(()=>G.readTheTable(uncommitted));assert.equal(JSON.stringify(uncommitted),before);
  for(const phase of ['reveal','lucky-break','flexible-carry']){const s=setup(2);s.phase=phase;const before=JSON.stringify(s);assert.throws(()=>G.readTheTable(s));assert.equal(JSON.stringify(s),before);}
  for(const level of [0]){const s=setup(level),before=JSON.stringify(s);assert.throws(()=>G.readTheTable(s));assert.equal(JSON.stringify(s),before);}
  const ended=setup(2);ended.winner=0;assert.throws(()=>G.readTheTable(ended));
});

test('rank reveals work with no discards left and do not depend on future draw order', () => {
  const a=setup(2),b=setup(2);b.sides[1].pile.reverse();
  for(const s of [a,b]){
    G.discard(s,0,s.sides[0].hand.slice(0,3));assert.equal(G.remainingDiscards(s.sides[0]),0);
    const before=JSON.stringify(s.sides);G.readTheTable(s,G.rng(15));assert.equal(JSON.stringify(s.sides),before);
  }
  assert.deepEqual(a.readTheTable.reveals,b.readTheTable.reveals);
});

test('new hands and refreshes clear old reveals but never replenish the encounter use', () => {
  const random=G.rng(23),s=setup(2);G.readTheTable(s,()=>0);
  G.reveal(s,[s.sides[0].hand.slice(0,3),[20,5,15]]);G.nextHand(s,random);
  assert.equal(s.bossCommitment,null);assert.deepEqual(s.readTheTable.reveals,[]);assert.equal(s.readTheTable.remaining,0);
  s.sides[1]=structuredClone(s.sides[0]);s.sides[1].discardAllowance=1;
  G.commitBossPlay(s,s.sides[1].hand.slice(0,3));
  s.sides[0].out.push(...s.sides[0].pile.splice(0));
  G.reveal(s,s.sides.map(side=>side.hand.slice(0,3)));const wins=[...s.wins];
  assert.equal(G.nextHand(s,random),true);assert.deepEqual(s.wins,wins);assert.equal(s.readTheTable.remaining,0);
  assert.deepEqual(s.readTheTable.reveals,[]);assert.equal(s.bossCommitment,null);
  assert.equal(G.newEncounter(random,{'read-the-table':2}).readTheTable.remaining,1);
  assert.equal(G.newEncounter(random).readTheTable.remaining,0);
});
