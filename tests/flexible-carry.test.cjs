const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');

function account(s) {
  for(const side of s.sides){const cards=[...side.hand,...side.pile,...side.out];assert.equal(cards.length,G.deck().length);assert.equal(new Set(cards).size,G.deck().length);}
}
function showdown(s) { G.reveal(s,s.sides.map(side=>side.hand.slice(0,3))); }
function tie(s) { s.sides[1]=structuredClone(s.sides[0]);s.sides[1].discardAllowance=1;showdown(s); }

test('normal refill remains optional and does not spend Flexible Carry uses', () => {
  for(const upgrades of [{},{'flexible-carry':1}]){
    const s=G.newEncounter(G.rng(41),upgrades);showdown(s);
    const kept=s.sides[0].hand.slice(),draws=s.sides[0].pile.slice(0,3),uses=s.flexibleCarry.remaining;
    assert.equal(G.nextHand(s),false);assert.deepEqual(s.sides[0].hand,[...kept,...draws]);
    assert.equal(s.flexibleCarry.remaining,uses);assert.equal(s.handNumber,2);account(s);
  }
});

test('Flexible Carry draws four, permits discarding retained or new cards, then begins exactly one hand', () => {
  for(const discardIndex of [0,5]){
    const s=G.newEncounter(G.rng(22),{'flexible-carry':2});showdown(s);
    const player=s.sides[0],kept=player.hand.slice(),draws=player.pile.slice(0,4),boss=JSON.stringify(s.sides[1]),wins=[...s.wins];
    G.activateFlexibleCarry(s);
    assert.equal(s.phase,'flexible-carry');assert.equal(s.handNumber,1);assert.equal(s.flexibleCarry.remaining,1);
    assert.deepEqual(player.hand,[...kept,...draws]);assert.equal(player.pile.length,G.deck().length-9);assert.equal(JSON.stringify(s.sides[1]),boss);account(s);
    const before=JSON.stringify(s);
    assert.throws(()=>G.resolveFlexibleCarry(s,99));assert.throws(()=>G.nextHand(s));assert.throws(()=>G.discard(s,0,player.hand[0]));
    assert.throws(()=>G.activateLuckyBreak(s,[player.hand[0]]));assert.throws(()=>showdown(s));assert.throws(()=>G.activateFlexibleCarry(s));assert.equal(JSON.stringify(s),before);
    const discard=player.hand[discardIndex],expected=player.hand.filter(c=>c!==discard);
    G.resolveFlexibleCarry(s,discard);assert.equal(s.phase,'choose');assert.equal(s.handNumber,2);
    assert.deepEqual(player.hand,expected);assert.equal(player.pile.length,G.deck().length-9);assert.ok(player.out.includes(discard));
    assert.equal(s.sides[1].hand.length,5);assert.equal(s.sides[1].pile.length,G.deck().length-8);assert.deepEqual(s.wins,wins);account(s);
    const after=JSON.stringify(s);assert.throws(()=>G.resolveFlexibleCarry(s,discard));assert.equal(JSON.stringify(s),after);
  }
});

test('exhaustion precedence: insufficient extra card or boss refill blocks activation atomically', () => {
  for(const [playerPile,bossPile,refresh] of [[3,5,false],[2,5,true],[5,2,true]]){
    const s=G.newEncounter(G.rng(31),{'flexible-carry':2});showdown(s);
    [playerPile,bossPile].forEach((size,i)=>s.sides[i].out.push(...s.sides[i].pile.splice(size)));
    const before=JSON.stringify(s);assert.equal(G.canFlexibleCarry(s),false);assert.throws(()=>G.activateFlexibleCarry(s));assert.equal(JSON.stringify(s),before);
    assert.equal(G.nextHand(s,G.rng(7)),refresh);assert.equal(s.flexibleCarry.remaining,2);
    assert.ok(s.sides.every(side=>side.hand.length===5));account(s);
  }
  const s=G.newEncounter(G.rng(31),{'flexible-carry':1});showdown(s);
  s.sides[0].out.push(...s.sides[0].pile.splice(4));G.activateFlexibleCarry(s);assert.equal(s.sides[0].pile.length,0);
  G.resolveFlexibleCarry(s,s.sides[0].hand[0]);assert.equal(s.sides[0].hand.length,5);account(s);
});

test('per-boss limits, hand and refresh persistence, and ended encounters', () => {
  for(const level of [1,2]){
    const s=G.newEncounter(G.rng(6),{'flexible-carry':level});
    for(let i=0;i<level;i++){tie(s);assert.equal(G.canFlexibleCarry(s),true);G.activateFlexibleCarry(s);G.resolveFlexibleCarry(s,s.sides[0].hand[0]);assert.equal(s.flexibleCarry.remaining,level-i-1);}
    tie(s);const before=JSON.stringify(s);assert.throws(()=>G.activateFlexibleCarry(s));assert.equal(JSON.stringify(s),before);
    s.sides[0].out.push(...s.sides[0].pile.splice(0));G.nextHand(s,G.rng(3));assert.equal(s.flexibleCarry.remaining,0);account(s);
    assert.equal(G.newEncounter(G.rng(3),{'flexible-carry':level}).flexibleCarry.remaining,level);
  }
  for(const winner of [0,1]){const s=G.newEncounter(G.rng(8),{'flexible-carry':2});showdown(s);s.winner=winner;const before=JSON.stringify(s);assert.equal(G.canFlexibleCarry(s),false);assert.throws(()=>G.activateFlexibleCarry(s));assert.equal(JSON.stringify(s),before);}
  const unowned=G.newEncounter(G.rng(8));showdown(unowned);assert.equal(G.canFlexibleCarry(unowned),false);
});

test('Flexible Carry does not spend Quick Draw or Lucky Break resources', () => {
  const s=G.newEncounter(G.rng(52),{'quick-draw':2,'lucky-break':2,'flexible-carry':2});
  G.activateLuckyBreak(s,[s.sides[0].hand[0]]);G.resolveLuckyBreak(s,s.luckyBreak.pending.candidates[0]);
  const used=s.sides[0].discardsUsed,lucky=s.luckyBreak.remaining;showdown(s);G.activateFlexibleCarry(s);
  assert.equal(s.sides[0].discardsUsed,used);assert.equal(s.luckyBreak.remaining,lucky);
  G.resolveFlexibleCarry(s,s.sides[0].hand[0]);assert.equal(G.remainingDiscards(s.sides[0]),3);
  assert.equal(s.luckyBreak.remaining,lucky);assert.equal(s.flexibleCarry.remaining,1);account(s);
  G.activateLuckyBreak(s,[s.sides[0].hand[0]]);G.resolveLuckyBreak(s,s.luckyBreak.pending.candidates[1]);
  G.discard(s,0,s.sides[0].hand.slice(0,2));assert.equal(G.remainingDiscards(s.sides[0]),0);account(s);
});
