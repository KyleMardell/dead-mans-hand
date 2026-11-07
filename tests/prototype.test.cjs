const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../engine.js');

test('8s work through combined discards, information abilities, showdown and six-card refill',()=>{
  const s=G.newEncounter(G.rng(3),{'quick-draw':2,'lucky-break':2,'flexible-carry':2,'read-the-table':2,'last-stand':1,'peek-ahead':2});
  const hand=[4,9,14,19,24];
  s.sides[0].hand=[...hand];s.sides[0].pile=G.deck().filter(c=>!hand.includes(c));s.sides[0].out=[];
  s.sides[1].hand=[0,5,10,15,20];s.sides[1].pile=G.deck().filter(c=>!s.sides[1].hand.includes(c));s.sides[1].out=[];
  s.wins[1]=G.rules.winsRequired-1;
  G.commitBossPlay(s,[0,5,15]);G.readTheTable(s,()=>0);
  assert.equal(s.readTheTable.reveals[0].rank,'8');
  assert.equal(G.peekAhead(s).rank,'8');
  G.discard(s,0,4);assert.ok(s.sides[0].hand.includes(0));
  G.activateLuckyBreak(s,[9]);assert.deepEqual(s.luckyBreak.pending.candidates,[1,2]);
  G.resolveLuckyBreak(s,1);assert.ok(s.sides[0].out.includes(2));
  G.reveal(s,[[0,1,14],[0,5,15]]);
  assert.equal(s.winner,null);assert.deepEqual(s.sides[0].hand,[19,24]);
  G.activateFlexibleCarry(s);assert.equal(s.sides[0].hand.length,6);assert.ok(s.sides[0].hand.includes(3));
  G.resolveFlexibleCarry(s,5);assert.equal(s.sides[0].hand.length,5);
  assert.equal(s.lastStand.active,true);assert.equal(G.remainingDiscards(s.sides[0]),5);
  assert.equal(s.luckyBreak.remaining,1);assert.equal(s.flexibleCarry.remaining,1);assert.equal(s.readTheTable.remaining,0);
  assert.equal(G.peekAhead(s).rank,G.ranks[Math.floor(s.sides[0].pile[0]/4)]);
  for(const side of s.sides){const cards=[...side.hand,...side.pile,...side.out];assert.equal(cards.length,28);assert.equal(new Set(cards).size,28);}
});

test('restoring just the central settings restores 24-card scoring and relative Last Stand timing',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
  const legacySource=source.replace('lowestRank: 8, winsRequired: 3','lowestRank: 9, winsRequired: 2');
  assert.notEqual(legacySource,source);
  const module={exports:{}};new Function('module',legacySource)(module);const L=module.exports;
  assert.equal(L.deck().length,24);assert.equal(L.rank(0),9);assert.equal(L.rank(23),14);
  const s=L.newEncounter(L.rng(1),{'last-stand':1});
  s.wins=[0,1];s.phase='reveal';s.sides.forEach(side=>side.hand=side.hand.slice(0,2));L.nextHand(s,L.rng(2));
  assert.equal(s.lastStand.active,true);assert.equal(L.remainingDiscards(s.sides[0]),3);
  s.wins=[1,1];s.sides[0].hand=[20,21,22,0,1];s.sides[1].hand=[0,5,10,11,12];
  L.reveal(s,[[20,21,22],[0,5,10]]);assert.equal(s.winner,0);
});

test('How to Play illustrated examples still match their printed ranks and hand categories',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const examples=[...html.matchAll(/data-example="([\d,]+)"[^>]*aria-label="Example: ([^"]+)"/g)];
  assert.equal(examples.length,6);
  examples.forEach((m,i)=>{
    const cards=m[1].split(',').map(Number);
    assert.equal(G.evaluate(cards).category,5-i);
    const printed=m[2].split(', ').map(s=>s.split(' of ')[0]);
    assert.deepEqual(cards.map(c=>G.ranks[Math.floor(c/4)]),printed);
  });
});
