const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');
const card = (r, s = 0) => (r - 9) * 4 + s;
test('all 2024 triples: exact category counts and suit-independent equality', () => {
  const counts = Array(6).fill(0);
  for (const c of G.combinations(G.deck(), 3)) counts[G.evaluate(c).category]++;
  assert.deepEqual(counts, [960, 720, 64, 240, 24, 16]);
  assert.equal(G.score([card(12), card(13), card(14)]), G.score([card(12, 1), card(13, 1), card(14, 1)]));
});
test('ranking order, pair rank before kicker, no ace wraparound', () => {
  const hands = [[card(14), card(12, 1), card(9, 2)], [card(9), card(9, 1), card(14)], [card(9), card(11), card(14)], [card(9), card(10, 1), card(11, 2)], [card(9), card(9, 1), card(9, 2)], [card(12), card(13), card(14)]];
  hands.forEach((h, i) => assert.equal(G.evaluate(h).category, i));
  assert.ok(G.score([card(10), card(10, 1), card(9)]) > G.score([card(9), card(9, 1), card(14)]));
  assert.equal(G.evaluate([card(14), card(9, 1), card(10, 2)]).category, 0);
});
test('discard once, carry two cards, never reuse out cards, reject invalid play', () => {
  const s = G.newEncounter(G.rng(42));
  const discarded = s.sides[0].hand[0]; G.discard(s, 0, discarded);
  assert.throws(() => G.discard(s, 0, s.sides[0].hand[0]));
  const plays = s.sides.map(x => x.hand.slice(0, 3));
  const kept = s.sides.map(x => x.hand.slice(3));
  assert.throws(() => G.reveal(s, [[discarded, ...plays[0].slice(1)], plays[1]]));
  G.reveal(s, plays); assert.throws(() => G.reveal(s, plays)); G.nextHand(s, G.rng(1));
  s.sides.forEach((x, i) => { assert.ok(kept[i].every(c => x.hand.includes(c))); assert.equal(new Set([...x.hand, ...x.pile, ...x.out]).size, 24); assert.equal(x.hand.length + x.pile.length + x.out.length, 24); assert.ok(x.out.every(c => !x.hand.includes(c))); });
});
test('ties award no wins; repeated ties exhaust decks and refresh both retaining score', () => {
  const random = G.rng(9), s = G.newEncounter(random);
  // Duplicate independently legal deck states to force ties, not a shared deck.
  s.sides[1] = structuredClone(s.sides[0]); s.wins = [1, 0];
  for (let i = 0; i < 6; i++) {
    s.sides.forEach((x, j) => { if (x.pile.length) G.discard(s, j, x.hand[0]); });
    const plays = s.sides.map(x => x.hand.slice(0, 3)); G.reveal(s, plays);
    assert.deepEqual(s.wins, [1, 0]); assert.equal(s.winner, null);
    const refreshed = G.nextHand(s, random);
    if (refreshed) { assert.equal(s.refreshes, 1); assert.ok(s.sides.every(x => x.hand.length === 5 && x.pile.length === 19 && x.out.length === 0)); break; }
  }
  assert.equal(s.refreshes, 1);
});
test('first to two stops immediately; deck order cannot influence discard decision', () => {
  const s = G.newEncounter(G.rng(2));
  const a = { hand: [0, 4, 8, 13, 18], pile: [1, 2, 3, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23], discarded: false };
  assert.equal(G.discardChoice(a, 'expected'), G.discardChoice({ ...a, pile: [...a.pile].reverse() }, 'expected'));
  s.sides[0].hand = [20, 21, 22, 0, 1]; s.sides[1].hand = [0, 5, 10, 11, 12]; s.wins = [1, 0];
  G.reveal(s, [[20, 21, 22], [0, 5, 10]]); assert.equal(s.winner, 0); assert.throws(() => G.nextHand(s));
});
test('seeded strategies are reproducible and encounters terminate', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const r = G.simulate(G.policies.greedy, G.policies.conserve, seed);
    assert.ok(r.hands >= 2); assert.ok(r.winner === 0 || r.winner === 1);
    if (seed === 1) assert.deepEqual(r, G.simulate(G.policies.greedy, G.policies.conserve, seed));
  }
});
test('one depleted side refreshes both, while an empty pile forbids replacement', () => {
  const random=G.rng(10),s=G.newEncounter(random);
  s.sides[0].out.push(...s.sides[0].pile.splice(0));
  assert.throws(()=>G.discard(s,0,s.sides[0].hand[0]));
  G.reveal(s,s.sides.map(x=>x.hand.slice(0,3)));
  const wins=[...s.wins]; assert.equal(G.nextHand(s,random),true);
  assert.deepEqual(s.wins,wins);
  s.sides.forEach(x=>{assert.equal(x.pile.length,19);assert.equal(x.out.length,0);assert.equal(x.hand.length,5);});
});
