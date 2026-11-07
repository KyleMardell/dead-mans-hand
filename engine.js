(function (root) {
  'use strict';
  // Local Scenario C prototype. Restore Scenario A with lowestRank: 9, winsRequired: 2.
  const rules = Object.freeze({ lowestRank: 8, winsRequired: 3 });
  const ranks = ['8', '9', '10', 'J', 'Q', 'K', 'A'].slice(rules.lowestRank - 8);
  const suits = ['♠', '♥', '♣', '♦'];
  const names = ['High card', 'Pair', 'Flush', 'Straight', 'Three of a kind', 'Straight flush'];
  const deck = () => Array.from({ length: ranks.length * suits.length }, (_, i) => i);
  const rank = c => rules.lowestRank + Math.floor(c / 4);
  const suit = c => c % 4;
  const label = c => ranks[Math.floor(c / 4)] + suits[suit(c)];
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(cards, random) {
    const out = [...cards];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function combinations(cards, n) {
    const out = [];
    function walk(start, chosen) { if (chosen.length === n) { out.push(chosen); return; } for (let i = start; i <= cards.length - n + chosen.length; i++) walk(i + 1, [...chosen, cards[i]]); }
    walk(0, []); return out;
  }
  function evaluate(cards) {
    if (cards.length !== 3 || new Set(cards).size !== 3 || cards.some(c => !Number.isInteger(c) || c < 0 || c >= ranks.length * suits.length)) throw Error('Choose three distinct cards.');
    const r = cards.map(rank).sort((a, b) => b - a);
    const flush = cards.every(c => suit(c) === suit(cards[0]));
    const straight = r[0] - r[1] === 1 && r[1] - r[2] === 1;
    let category, kickers;
    if (straight && flush) { category = 5; kickers = [r[0]]; }
    else if (r[0] === r[2]) { category = 4; kickers = [r[0]]; }
    else if (straight) { category = 3; kickers = [r[0]]; }
    else if (flush) { category = 2; kickers = r; }
    else if (r[0] === r[1] || r[1] === r[2]) { category = 1; kickers = r[0] === r[1] ? [r[0], r[2]] : [r[1], r[0]]; }
    else { category = 0; kickers = r; }
    const score = category * 3375 + (kickers[0] || 0) * 225 + (kickers[1] || 0) * 15 + (kickers[2] || 0);
    return { category, kickers, score, name: names[category] };
  }
  const tripleScores = new Map(combinations(deck(), 3).map(c => [key(c), evaluate(c).score]));
  function key(cards) { return [...cards].sort((a, b) => a - b).join(','); }
  const score = cards => tripleScores.get(key(cards));
  function options(hand) { return combinations(hand, 3).map(cards => ({ cards, score: score(cards), kept: hand.filter(c => !cards.includes(c)) })); }
  function strongest(hand) { return options(hand).reduce((a, b) => b.score > a.score ? b : a); }
  let model;
  function prepareModel() {
    if (model) return model;
    const hands = combinations(deck(), 5);
    const hist = new Map();
    const best = hands.map(h => strongest(h).score);
    best.forEach(s => hist.set(s, (hist.get(s) || 0) + 1));
    const equity = new Map(); let below = 0;
    for (const s of [...tripleScores.values()].sort((a, b) => a - b)) {
      if (equity.has(s)) continue;
      equity.set(s, (below + (hist.get(s) || 0) / 2) / hands.length);
      below += hist.get(s) || 0;
    }
    const sums = new Map(), counts = new Map();
    hands.forEach((h, i) => combinations(h, 2).forEach(pair => {
      const k = key(pair); sums.set(k, (sums.get(k) || 0) + equity.get(best[i])); counts.set(k, (counts.get(k) || 0) + 1);
    }));
    const future = new Map([...sums].map(([k, s]) => [k, s / counts.get(k)]));
    model = { equity, future }; return model;
  }
  function utility(option, style = 'greedy', final = false) {
    const m = prepareModel();
    return m.equity.get(option.score) + (style === 'conserve' && !final ? 0.65 * m.future.get(key(option.kept)) : 0);
  }
  function choose(hand, style, random, final = false) {
    const opts = options(hand);
    if (style === 'random') return opts[Math.floor(random() * opts.length)];
    if (style !== 'conserve' || final) return strongest(hand);
    return opts.reduce((a, b) => utility(b, style, final) > utility(a, style, final) ? b : a);
  }
  function newSide(random, discardAllowance = 1) { const pile = shuffle(deck(), random); return { hand: pile.splice(0, 5), pile, out: [], discarded: false, discardAllowance, discardsUsed: 0 }; }
  function newEncounter(random = Math.random, upgrades = {}) {
    const level = upgrades['quick-draw'] || 0;
    const allowance = 1 + (Number.isInteger(level) ? Math.max(0, Math.min(2, level)) : 0);
    const luckyLevel = upgrades['lucky-break'] || 0;
    const luckyUses = Number.isInteger(luckyLevel) ? Math.max(0, Math.min(2, luckyLevel)) : 0;
    const carryLevel = upgrades['flexible-carry'] || 0;
    const carryUses = Number.isInteger(carryLevel) ? Math.max(0, Math.min(2, carryLevel)) : 0;
    const readLevel = Number.isInteger(upgrades['read-the-table']) ? Math.max(0, Math.min(2, upgrades['read-the-table'])) : 0;
    const peekLevel = Number.isInteger(upgrades['peek-ahead']) ? Math.max(0, Math.min(2, upgrades['peek-ahead'])) : 0;
    return { sides: [newSide(random, allowance), newSide(random)], wins: [0, 0], handNumber: 1, ties: 0, refreshes: 0, winner: null, phase: 'choose', last: null, luckyBreak: { limit: luckyUses, remaining: luckyUses, pending: null }, flexibleCarry: { limit: carryUses, remaining: carryUses }, bossCommitment: null, readTheTable: { level: readLevel, remaining: readLevel ? 1 : 0, reveals: [] }, lastStand: { owned: upgrades['last-stand'] === 1, active: false, baseAllowance: allowance }, peekAheadLevel: peekLevel };
  }
  function discard(state, sideIndex, card) {
    const side = state.sides[sideIndex];
    const cards = Array.isArray(card) ? card : [card];
    // Validate the complete batch before consuming any cards or allowance.
    if (state.phase !== 'choose' || (sideIndex === 1 && state.bossCommitment) || !cards.length || cards.length > remainingDiscards(side) || cards.length > side.pile.length || new Set(cards).size !== cards.length || !cards.every(c => side.hand.includes(c))) throw Error('Discard unavailable.');
    cards.forEach(c => { side.hand[side.hand.indexOf(c)] = side.pile.shift(); side.out.push(c); });
    side.discardsUsed = (side.discardsUsed || 0) + cards.length;
    side.discarded = side.discardsUsed >= (side.discardAllowance ?? 1);
  }
  function remainingDiscards(side) { return side.discarded ? 0 : Math.max(0, (side.discardAllowance ?? 1) - (side.discardsUsed || 0)); }
  function peekAhead(state) {
    const pile = state.sides[0].pile;
    if (!pile.length) return { empty: true };
    if (!state.peekAheadLevel) return { empty: false };
    const card = pile[0];
    const info = { empty: false, rank: ranks[Math.floor(card / 4)] };
    if (state.peekAheadLevel === 2) info.suit = suits[suit(card)];
    return info;
  }
  function activateLuckyBreak(state, cards) {
    const side = state.sides[0], ability = state.luckyBreak;
    if (state.phase !== 'choose' || state.winner !== null || !ability || ability.remaining < 1 || !Array.isArray(cards) || cards.length !== 1 || side.hand.length !== 5 || !side.hand.includes(cards[0]) || remainingDiscards(side) < 1 || side.pile.length < 2) throw Error('Lucky Break unavailable.');
    const index = side.hand.indexOf(cards[0]);
    side.out.push(...side.hand.splice(index, 1));
    ability.pending = { index, candidates: side.pile.splice(0, 2) };
    side.discardsUsed = (side.discardsUsed || 0) + 1;
    side.discarded = side.discardsUsed >= (side.discardAllowance ?? 1);
    ability.remaining--;
    state.phase = 'lucky-break';
  }
  function resolveLuckyBreak(state, card) {
    const pending = state.luckyBreak?.pending;
    if (state.phase !== 'lucky-break' || !pending || !pending.candidates.includes(card)) throw Error('Choose a Lucky Break candidate.');
    const side = state.sides[0];
    side.hand.splice(pending.index, 0, card);
    side.out.push(...pending.candidates.filter(c => c !== card));
    state.luckyBreak.pending = null;
    state.phase = 'choose';
  }
  function canFlexibleCarry(state) {
    return state.phase === 'reveal' && state.winner === null && state.flexibleCarry?.remaining > 0 && state.sides[0].hand.length === 2 && state.sides[0].pile.length >= 4 && state.sides.every(side => side.pile.length >= 5 - side.hand.length);
  }
  function activateFlexibleCarry(state) {
    // A required bilateral refresh takes precedence over this optional refill.
    if (!canFlexibleCarry(state)) throw Error('Flexible Carry unavailable.');
    state.sides[0].hand.push(...state.sides[0].pile.splice(0, 4));
    state.flexibleCarry.remaining--;
    state.phase = 'flexible-carry';
  }
  function resolveFlexibleCarry(state, card) {
    const side = state.sides[0];
    if (state.phase !== 'flexible-carry' || side.hand.length !== 6 || !side.hand.includes(card)) throw Error('Choose one held card to discard.');
    side.hand.splice(side.hand.indexOf(card), 1);
    side.out.push(card);
    // Reuse the normal transition: refill the boss and reset per-hand counters.
    state.phase = 'reveal';
    nextHand(state);
  }
  function commitBossPlay(state, cards) {
    if (state.phase !== 'choose' || state.winner !== null || state.bossCommitment) throw Error('Boss decision already committed or unavailable.');
    evaluate(cards);
    if (!cards.every(c => state.sides[1].hand.includes(c))) throw Error('Boss card not held.');
    state.bossCommitment = Object.freeze([...cards]);
    return state.bossCommitment;
  }
  function readTheTable(state, random = Math.random) {
    const ability = state.readTheTable;
    if (state.phase !== 'choose' || state.winner !== null || !ability?.remaining || !state.bossCommitment) throw Error('Read the Table unavailable.');
    const pool = [...state.bossCommitment];
    const reveals = [];
    for (let i = 0; i < ability.level; i++) {
      const card = pool.splice(Math.floor(random() * pool.length), 1)[0];
      reveals.push({ position: state.sides[1].hand.indexOf(card), rank: ranks[Math.floor(card / 4)] });
    }
    ability.reveals = reveals;
    ability.remaining = 0;
  }
  function bestUtility(hand, style, final) { return utility(choose(hand, style, () => 0, final), style, final); }
  function discardChoice(side, method, style = 'greedy', final = false) {
    if (method === 'none' || side.discarded || !side.pile.length) return null;
    if (method === 'low') return [...side.hand].sort((a, b) => rank(a) - rank(b) || a - b)[0];
    let best = bestUtility(side.hand, style, final), choice = null;
    for (const card of side.hand) {
      let expected = 0;
      // Only the unordered remaining card pool is used; no access to the next draw.
      for (const replacement of side.pile) expected += bestUtility(side.hand.map(c => c === card ? replacement : c), style, final);
      expected /= side.pile.length;
      if (expected > best + 1e-10) { best = expected; choice = card; }
    }
    return choice;
  }
  function aiTurn(state, index, policy, random) {
    if (index === 1 && state.bossCommitment) return [...state.bossCommitment];
    const side = state.sides[index];
    const style = random() < (policy.skill ?? 1) ? policy.style : 'random';
    const final = state.wins.every(wins => wins === rules.winsRequired - 1);
    const card = discardChoice(side, policy.discard, style === 'random' ? 'greedy' : style, final);
    if (card !== null) discard(state, index, card);
    return choose(side.hand, style, random, final).cards;
  }
  function reveal(state, plays) {
    if (state.phase !== 'choose' || state.winner !== null) throw Error('Hand already resolved.');
    if (state.bossCommitment && key(plays[1]) !== key(state.bossCommitment)) throw Error('Boss decision cannot change.');
    plays.forEach((cards, i) => { evaluate(cards); if (!cards.every(c => state.sides[i].hand.includes(c))) throw Error('Card not held.'); });
    const scores = plays.map(score); const result = Math.sign(scores[0] - scores[1]);
    if (result) state.wins[result > 0 ? 0 : 1]++; else state.ties++;
    plays.forEach((cards, i) => { const side = state.sides[i]; side.hand = side.hand.filter(c => !cards.includes(c)); side.out.push(...cards); });
    state.last = { plays: plays.map(c => [...c]), result, scores };
    state.winner = state.wins[0] === rules.winsRequired ? 0 : state.wins[1] === rules.winsRequired ? 1 : null;
    if (state.winner !== null) state.lastStand.active = false;
    state.phase = 'reveal'; return state.last;
  }
  function nextHand(state, random = Math.random) {
    if (state.phase !== 'reveal' || state.winner !== null) throw Error('Cannot deal another hand.');
    let refreshed = false;
    if (state.sides.some(side => side.pile.length < 5 - side.hand.length)) {
      state.sides = state.sides.map(side => newSide(random, side.discardAllowance ?? 1)); state.refreshes++; refreshed = true;
    } else state.sides.forEach(side => { side.hand.push(...side.pile.splice(0, 5 - side.hand.length)); side.discarded = false; side.discardsUsed = 0; });
    // Apply the passive only at the new-hand boundary, never to a resolved hand.
    state.lastStand.active = state.lastStand.owned && state.wins[1] === rules.winsRequired - 1;
    if (state.lastStand.owned) state.sides[0].discardAllowance = state.lastStand.baseAllowance + (state.lastStand.active ? 2 : 0);
    state.bossCommitment = null; state.readTheTable.reveals = [];
    state.handNumber++; state.phase = 'choose'; return refreshed;
  }
  const policies = {
    random: { style: 'random', discard: 'none' },
    greedy: { style: 'greedy', discard: 'none' },
    low: { style: 'greedy', discard: 'low' },
    informed: { style: 'greedy', discard: 'expected' },
    conserve: { style: 'conserve', discard: 'none' },
    planner: { style: 'conserve', discard: 'expected' }
  };
  const bosses = [
    { name: 'The Drifter', title: 'Learning the ropes', style: 'greedy', skill: 0.15, discard: 'none' },
    { name: 'The Gambler', title: 'Trusts a hunch', style: 'greedy', skill: 0.45, discard: 'low' },
    { name: 'The Deputy', title: 'Knows a good hand', style: 'greedy', skill: 0.75, discard: 'none' },
    { name: 'The Sheriff', title: 'Chooses with care', style: 'greedy', skill: 1, discard: 'none' },
    { name: 'The Undertaker', title: 'Makes every draw count', style: 'greedy', skill: 1, discard: 'expected' }
  ];
  function simulate(a, b, seed) {
    const random = rng(seed), state = newEncounter(random);
    for (let i = 0; i < 1000; i++) {
      const plays = [aiTurn(state, 0, a, random), aiTurn(state, 1, b, random)]; reveal(state, plays);
      if (state.winner !== null) return { winner: state.winner, hands: state.handNumber, ties: state.ties, refreshes: state.refreshes };
      nextHand(state, random);
    }
    throw Error('Simulation did not terminate within 1000 hands.');
  }
  const api = { rules, ranks, suits, names, deck, rank, suit, label, rng, shuffle, combinations, evaluate, score, strongest, prepareModel, choose, newEncounter, discard, remainingDiscards, peekAhead, activateLuckyBreak, resolveLuckyBreak, canFlexibleCarry, activateFlexibleCarry, resolveFlexibleCarry, commitBossPlay, readTheTable, discardChoice, aiTurn, reveal, nextHand, policies, bosses, simulate };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DMH = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
