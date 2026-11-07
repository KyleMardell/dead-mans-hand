(function (root) {
  'use strict';
  // Metadata and collection rules; enabled effects are applied by engine.js.
  const definitions = Object.freeze([
    { id: 'quick-draw', artwork: { src: 'assets/images/upgrades/Quick Draw Card.png', width: 1752, height: 897 }, name: 'Quick Draw', type: 'Passive', implemented: true, maxLevel: 2, levels: ['Two discards per hand.', 'Three discards per hand.'] },
    { id: 'lucky-break', artwork: { src: 'assets/images/upgrades/Lucky Break Card.png', width: 1755, height: 896 }, name: 'Lucky Break', type: 'Active', implemented: true, maxLevel: 2, levels: ['Once per boss, discard one card using your allowance, draw two candidates, keep one and put the other out.', 'Twice per boss, discard one card using your allowance, draw two candidates, keep one and put the other out.'] },
    { id: 'flexible-carry', artwork: { src: 'assets/images/upgrades/Flexible Carry Card.png', width: 1672, height: 941 }, name: 'Flexible Carry', type: 'Active', implemented: true, maxLevel: 2, levels: ['Once per boss, keep your two cards and draw four after a showdown, then discard one of the six. No normal discard is spent.', 'Twice per boss, keep your two cards and draw four after a showdown, then discard one of the six. No normal discard is spent.'] },
    { id: 'read-the-table', artwork: { src: 'assets/images/upgrades/Read the Table.png', width: 1755, height: 896 }, name: 'Read the Table', type: 'Active', implemented: true, maxLevel: 2, levels: ["Once per boss, reveal the rank of one randomly selected committed boss card. Suits stay hidden; no discard is spent.", "Once per boss, reveal ranks from two distinct randomly selected committed boss cards. Ranks may match. Suits stay hidden; no discard is spent."] },
    { id: 'last-stand', artwork: { src: 'assets/images/upgrades/Last Stand Card.png', width: 1755, height: 896 }, name: 'Last Stand', type: 'Passive', implemented: true, unique: true, maxLevel: 1, levels: ['Starting with the next hand after the boss is one win from taking the encounter, gain two extra discards each hand for the rest of that encounter. Adds to Quick Draw; does not stack.'] },
    { id: 'peek-ahead', artwork: { src: 'assets/images/upgrades/Peek Ahead Card.png', width: 1755, height: 896 }, name: 'Peek Ahead', type: 'Passive', implemented: true, maxLevel: 2, levels: ["Always see the rank of your actual next draw. Suit stays hidden; no cards or uses are spent.", "Always see the rank and suit of your actual next draw. No cards or uses are spent."] }
  ].map(d => Object.freeze({ implemented: false, ...d, artwork: Object.freeze(d.artwork), levels: Object.freeze(d.levels) })));
  const byId = new Map(definitions.map(d => [d.id, d]));
  const get = id => byId.get(id);
  const eligible = collection => definitions.filter(d => (collection[d.id] || 0) < d.maxLevel);
  function offer(collection, random = Math.random) {
    const pool = eligible(collection).map(d => d.id), result = [];
    // Uniform sampling without replacement: each eligible upgrade has equal odds.
    while (pool.length && result.length < 3) result.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return result;
  }
  function collect(collection, id) {
    const definition = get(id), current = collection[id] || 0;
    if (!definition || current >= definition.maxLevel) throw Error('Upgrade unavailable.');
    return { ...collection, [id]: current + 1 };
  }
  const api = { definitions, get, eligible, offer, collect };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DMHUpgrades = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
