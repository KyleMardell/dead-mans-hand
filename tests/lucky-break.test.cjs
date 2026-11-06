const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');

function account(state) {
  const side=state.sides[0],pending=state.luckyBreak.pending?.candidates || [];
  const cards=[...side.hand,...side.pile,...side.out,...pending];
  assert.equal(cards.length,24);assert.equal(new Set(cards).size,24);
}

test('Lucky Break draws the next two, spends one discard/use and accounts for all cards before and after choice', () => {
  for(const keepIndex of [0,1]){
    const s=G.newEncounter(G.rng(42),{'lucky-break':1,'quick-draw':1});
    const side=s.sides[0],original=side.hand[2],candidates=side.pile.slice(0,2),boss=JSON.stringify(s.sides[1]);
    G.activateLuckyBreak(s,[original]);
    assert.equal(s.phase,'lucky-break');assert.equal(side.hand.length,4);assert.deepEqual(s.luckyBreak.pending.candidates,candidates);
    assert.equal(side.pile.length,17);assert.deepEqual(side.out,[original]);account(s);
    assert.equal(G.remainingDiscards(side),1);assert.equal(s.luckyBreak.remaining,0);
    const before=JSON.stringify(s);assert.throws(()=>G.resolveLuckyBreak(s,original));assert.equal(JSON.stringify(s),before);
    assert.throws(()=>G.discard(s,0,side.hand[0]));
    assert.throws(()=>G.reveal(s,[side.hand.slice(0,3),s.sides[1].hand.slice(0,3)]));
    assert.throws(()=>G.nextHand(s));assert.throws(()=>G.activateLuckyBreak(s,[side.hand[0]]));assert.equal(JSON.stringify(s),before);
    G.resolveLuckyBreak(s,candidates[keepIndex]);
    assert.equal(s.phase,'choose');assert.equal(side.hand.length,5);assert.equal(side.hand[2],candidates[keepIndex]);
    assert.deepEqual(side.out,[original,candidates[1-keepIndex]]);assert.equal(s.luckyBreak.pending,null);account(s);
    assert.equal(JSON.stringify(s.sides[1]),boss);
    const resolved=JSON.stringify(s);assert.throws(()=>G.resolveLuckyBreak(s,candidates[keepIndex]));assert.equal(JSON.stringify(s),resolved);
  }
});

test('Lucky Break levels allow exactly one or two separate activations per encounter', () => {
  for(const level of [1,2]){
    const s=G.newEncounter(G.rng(12),{'lucky-break':level,'quick-draw':2});
    for(let i=0;i<level;i++){
      G.activateLuckyBreak(s,[s.sides[0].hand[0]]);
      assert.equal(s.luckyBreak.pending.candidates.length,2);
      G.resolveLuckyBreak(s,s.luckyBreak.pending.candidates[0]);account(s);
      assert.equal(s.luckyBreak.remaining,level-i-1);
    }
    const before=JSON.stringify(s);assert.throws(()=>G.activateLuckyBreak(s,[s.sides[0].hand[0]]));assert.equal(JSON.stringify(s),before);
    assert.equal(s.sides[0].discardsUsed,level);
    assert.equal(G.newEncounter(G.rng(13),{'lucky-break':level}).luckyBreak.remaining,level);
    assert.equal(G.newEncounter(G.rng(13)).luckyBreak.remaining,0);
  }
});

test('invalid Lucky Break activations are atomic: selection, ownership, phase, draw supply and discard allowance', () => {
  const make=()=>G.newEncounter(G.rng(17),{'lucky-break':2});
  for(const prepare of [s=>{s.luckyBreak.remaining=0;},s=>{s.sides[0].out.push(...s.sides[0].pile.splice(1));},s=>{G.discard(s,0,s.sides[0].hand[0]);},s=>{s.phase='reveal';},s=>{s.winner=1;}]){
    const s=make();prepare(s);
    const invalid=[s.sides[0].hand[0]];
    const before=JSON.stringify(s);assert.throws(()=>G.activateLuckyBreak(s,invalid));assert.equal(JSON.stringify(s),before);
  }
  for(const cards of [[],[0,1],[99]]){const s=make(),before=JSON.stringify(s);assert.throws(()=>G.activateLuckyBreak(s,cards));assert.equal(JSON.stringify(s),before);}
  const unowned=G.newEncounter(G.rng(7));assert.throws(()=>G.activateLuckyBreak(unowned,[unowned.sides[0].hand[0]]));
});

test('uses survive new hands and bilateral deck refreshes; normal Quick Draw remains available', () => {
  const random=G.rng(8),s=G.newEncounter(random,{'lucky-break':2,'quick-draw':2});
  G.activateLuckyBreak(s,[s.sides[0].hand[0]]);G.resolveLuckyBreak(s,s.luckyBreak.pending.candidates[0]);
  G.discard(s,0,s.sides[0].hand.slice(0,2));assert.equal(G.remainingDiscards(s.sides[0]),0);
  G.reveal(s,s.sides.map(side=>side.hand.slice(0,3)));G.nextHand(s,random);
  assert.equal(s.luckyBreak.remaining,1);assert.equal(G.remainingDiscards(s.sides[0]),3);
  s.sides[0].out.push(...s.sides[0].pile.splice(0));
  s.sides[1]=structuredClone(s.sides[0]);s.sides[1].discardAllowance=1;
  G.reveal(s,s.sides.map(side=>side.hand.slice(0,3)));
  const wins=[...s.wins];
  assert.equal(s.winner,null);assert.equal(G.nextHand(s,random),true);assert.equal(s.luckyBreak.remaining,1);assert.equal(G.remainingDiscards(s.sides[0]),3);assert.deepEqual(s.wins,wins);account(s);
});
