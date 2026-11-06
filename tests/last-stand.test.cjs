const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');

function hands(s,result) {
  const good=[20,21,22,0,1],bad=[0,5,10,11,12];
  const cards=result>0?[good,bad]:result<0?[bad,good]:[bad,bad];
  s.sides=cards.map((hand,i)=>({...s.sides[i],hand:[...hand],pile:G.deck().filter(c=>!hand.includes(c)),out:[],discarded:false,discardsUsed:0}));
  s.bossCommitment=null;
}
function outcome(s,result) { hands(s,result);G.reveal(s,s.sides.map(side=>side.hand.slice(0,3))); }
function account(s) { for(const side of s.sides){const cards=[...side.hand,...side.pile,...side.out];assert.equal(cards.length,24);assert.equal(new Set(cards).size,24);} }
function tie(s) { s.sides[1]=structuredClone(s.sides[0]);s.sides[1].discardAllowance=1;s.bossCommitment=null;G.reveal(s,s.sides.map(side=>side.hand.slice(0,3))); }

test('without Last Stand, a boss hand win never increases the normal allowance', () => {
  for(const level of [0,1,2]){
    const s=G.newEncounter(G.rng(8),{'quick-draw':level});outcome(s,-1);G.nextHand(s);
    assert.equal(s.sides[0].discardAllowance,level+1);assert.equal(s.lastStand.active,false);assert.equal(s.sides[1].discardAllowance,1);
  }
});

test('Last Stand begins next hand, adds to Quick Draw and supports batches or separate discards', () => {
  for(const level of [0,1,2]) for(const batch of [true,false]){
    const s=G.newEncounter(G.rng(12),{'quick-draw':level,'last-stand':1});hands(s,-1);
    G.discard(s,0,s.sides[0].hand[4]);const used=s.sides[0].discardsUsed;
    G.reveal(s,s.sides.map(side=>side.hand.slice(0,3)));
    assert.deepEqual(s.wins,[0,1]);assert.equal(s.lastStand.active,false);
    assert.equal(s.sides[0].discardAllowance,level+1);assert.equal(s.sides[0].discardsUsed,used);assert.equal(G.remainingDiscards(s.sides[0]),level);
    G.nextHand(s);assert.equal(s.lastStand.active,true);assert.equal(G.remainingDiscards(s.sides[0]),level+3);assert.equal(G.remainingDiscards(s.sides[1]),1);
    const cards=s.sides[0].hand.slice(0,level+3);
    if(batch)G.discard(s,0,cards);else cards.forEach(c=>G.discard(s,0,c));
    assert.equal(s.sides[0].hand.length,5);assert.equal(G.remainingDiscards(s.sides[0]),0);account(s);
    const before=JSON.stringify(s);assert.throws(()=>G.discard(s,0,s.sides[0].hand[0]));assert.equal(JSON.stringify(s),before);
  }
});

test('player wins and ties with no boss wins do not trigger; later ties preserve a non-stacking bonus', () => {
  const s=G.newEncounter(G.rng(3),{'quick-draw':2,'last-stand':1});
  outcome(s,0);G.nextHand(s);assert.equal(s.lastStand.active,false);assert.equal(G.remainingDiscards(s.sides[0]),3);
  outcome(s,1);G.nextHand(s);assert.equal(s.lastStand.active,false);assert.equal(G.remainingDiscards(s.sides[0]),3);
  outcome(s,-1);G.nextHand(s);assert.equal(s.lastStand.active,true);assert.equal(G.remainingDiscards(s.sides[0]),5);
  for(let i=0;i<3;i++){
    G.discard(s,0,s.sides[0].hand[0]);outcome(s,0);assert.deepEqual(s.wins,[1,1]);
    G.nextHand(s);assert.equal(s.lastStand.active,true);assert.equal(s.sides[0].discardAllowance,5);assert.equal(G.remainingDiscards(s.sides[0]),5);
  }
});

test('bonus ends on victory or defeat; a new encounter starts at base allowance and a new run removes ownership', () => {
  for(const result of [1,-1]){
    const upgrades={'last-stand':1,'quick-draw':2},s=G.newEncounter(G.rng(9),upgrades);
    outcome(s,-1);G.nextHand(s);assert.equal(s.lastStand.active,true);
    s.wins=[1,1];outcome(s,result);assert.equal(s.winner,result>0?0:1);assert.equal(s.lastStand.active,false);
    assert.throws(()=>G.nextHand(s));assert.throws(()=>G.discard(s,0,s.sides[0].hand[0]));
    const next=G.newEncounter(G.rng(10),upgrades);assert.equal(next.lastStand.owned,true);assert.equal(next.lastStand.active,false);assert.equal(G.remainingDiscards(next.sides[0]),3);
    const fresh=G.newEncounter(G.rng(11));assert.equal(fresh.lastStand.owned,false);assert.equal(G.remainingDiscards(fresh.sides[0]),1);
  }
});

test('Lucky Break, Flexible Carry, Read the Table and deck refreshes preserve the additive bonus', () => {
  const random=G.rng(6),s=G.newEncounter(random,{'last-stand':1,'quick-draw':2,'lucky-break':2,'flexible-carry':2,'read-the-table':2});
  outcome(s,-1);G.nextHand(s);G.commitBossPlay(s,s.sides[1].hand.slice(0,3));G.readTheTable(s,()=>0);
  G.activateLuckyBreak(s,[s.sides[0].hand[0]]);G.resolveLuckyBreak(s,s.luckyBreak.pending.candidates[0]);assert.equal(G.remainingDiscards(s.sides[0]),4);
  G.discard(s,0,s.sides[0].hand.slice(0,4));assert.equal(G.remainingDiscards(s.sides[0]),0);account(s);
  tie(s);assert.equal(G.canFlexibleCarry(s),true);G.activateFlexibleCarry(s);
  assert.equal(s.sides[0].discardAllowance,5);G.resolveFlexibleCarry(s,s.sides[0].hand[0]);
  assert.equal(G.remainingDiscards(s.sides[0]),5);assert.equal(s.luckyBreak.remaining,1);assert.equal(s.flexibleCarry.remaining,1);assert.equal(s.readTheTable.remaining,0);
  s.sides[0].out.push(...s.sides[0].pile.splice(0));tie(s);const wins=[...s.wins];
  assert.equal(G.nextHand(s,random),true);assert.deepEqual(s.wins,wins);assert.equal(s.lastStand.active,true);assert.equal(G.remainingDiscards(s.sides[0]),5);assert.equal(G.remainingDiscards(s.sides[1]),1);
  assert.equal(s.luckyBreak.remaining,1);assert.equal(s.flexibleCarry.remaining,1);assert.equal(s.readTheTable.remaining,0);account(s);
});
