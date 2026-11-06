const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');

function expected(s, level) {
  const c = s.sides[0].pile[0];
  if (c === undefined) return {empty:true};
  return {empty:false, ...(level ? {rank:G.ranks[Math.floor(c/4)]} : {}), ...(level===2 ? {suit:G.suits[G.suit(c)]} : {})};
}
function check(s, level) { assert.deepEqual(G.peekAhead(s), expected(s,level)); }
function showdown(s) { G.reveal(s,s.sides.map(side=>side.hand.slice(0,3))); }

test('Peek Ahead exposes only permitted information without changing cards, RNG or boss decisions', () => {
  const baseline = G.newEncounter(G.rng(61));
  for (const level of [0,1,2]) {
    let calls=0; const random=G.rng(61);
    const s=G.newEncounter(()=>{calls++;return random();},{'peek-ahead':level});
    assert.deepEqual({...s,peekAheadLevel:0},baseline);
    const before=JSON.stringify(s),count=calls;
    check(s,level); check(s,level);
    assert.equal(JSON.stringify(s),before); assert.equal(calls,count);
    assert.deepEqual(G.aiTurn(structuredClone(s),1,G.policies.informed,G.rng(5)),G.aiTurn(structuredClone(baseline),1,G.policies.informed,G.rng(5)));
    s.sides[1].pile.reverse(); check(s,level);
  }
});

test('next draw updates after batch discards, Lucky Break and Flexible Carry including pending choices', () => {
  for (const level of [1,2]) {
    const s=G.newEncounter(G.rng(41),{'peek-ahead':level,'quick-draw':2,'lucky-break':2,'flexible-carry':2});
    const initial=s.sides[0].pile.slice();
    G.discard(s,0,s.sides[0].hand.slice(0,2));
    assert.equal(s.sides[0].pile[0],initial[2]); check(s,level);
    G.activateLuckyBreak(s,[s.sides[0].hand[0]]);
    assert.equal(s.sides[0].pile[0],initial[4]); check(s,level);
    G.resolveLuckyBreak(s,s.luckyBreak.pending.candidates[1]); check(s,level);
    showdown(s); G.activateFlexibleCarry(s);
    assert.equal(s.sides[0].pile[0],initial[8]); check(s,level);
    G.resolveFlexibleCarry(s,s.sides[0].hand[0]); check(s,level);
    assert.equal(G.remainingDiscards(s.sides[0]),3);
  }
});

test('normal refill, empty piles, refresh and new encounters always use the actual deck', () => {
  for (const level of [0,1,2]) {
    const s=G.newEncounter(G.rng(41),{'peek-ahead':level});
    const next=s.sides[0].pile[3];showdown(s);G.nextHand(s,G.rng(12));
    assert.equal(s.sides[0].pile[0],next);check(s,level);
    s.sides[0].out.push(...s.sides[0].pile.splice(0));
    assert.deepEqual(G.peekAhead(s),{empty:true});
    s.sides[1]=structuredClone(s.sides[0]);showdown(s);
    assert.equal(G.nextHand(s,G.rng(17)),true);check(s,level);
    assert.equal(s.peekAheadLevel,level);
    const boss=G.newEncounter(G.rng(19),{'peek-ahead':level});check(boss,level);
  }
  const fresh=G.newEncounter(G.rng(19));assert.equal(fresh.peekAheadLevel,0);check(fresh,0);
});
