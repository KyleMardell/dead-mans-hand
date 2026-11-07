const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../engine.js');

test('all 15 identities have correct supplied artwork and no character AI policy',()=>{
  assert.equal(G.bosses.length,15);assert.equal(new Set(G.bosses.map(b=>b.id)).size,15);
  assert.deepEqual(G.bosses.filter(b=>b.final).map(b=>b.id),['undertaker','widow','preacher']);
  const additions={widow:['The Widow','She never loses twice','Widow.png'],preacher:['The Preacher','Confess your sins','Preacher.png'],'saloon-queen':['The Saloon Queen','The house always wins','Saloon Queen.png'],'bounty-hunter':['The Bounty Hunter','Your luck has a price','Bounty Hunter.png'],outlaw:['The Outlaw','Rules are made to break','Outlaw.png'],'snake-oil-man':['The Snake Oil Man',"A deal you can't refuse",'Snake Oil Man.png'],'card-shark':['The Card Shark',"She's already seen your hand",'Card Shark.png'],baron:['The Baron','Everything has a price','Baron.png'],'bandit-queen':['The Bandit Queen','All bets are off','Bandit Queen.png'],ghost:['The Ghost','You never saw him coming','Ghost.png']};
  for(const boss of G.bosses){
    assert.ok(!('skill' in boss)&&!('style' in boss)&&!('discard' in boss));
    if(additions[boss.id])assert.deepEqual([boss.name,boss.title,path.basename(boss.artwork.src)],additions[boss.id]);
    const bytes=fs.readFileSync(path.join(__dirname,'..',boss.artwork.src));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16),boss.artwork.width);assert.equal(bytes.readUInt32BE(20),boss.artwork.height);
  }
});

test('initial lineups are seeded, varied, distinct and reserve final identities for encounter five',()=>{
  const lineups=new Set(),regular=new Set(),finals=new Set();
  for(let seed=1;seed<=128;seed++){
    const lineup=G.createBossLineup(G.rng(seed));
    assert.deepEqual(lineup,G.createBossLineup(G.rng(seed)));
    assert.equal(lineup.length,5);assert.equal(new Set(lineup.map(b=>b.id)).size,5);
    assert.ok(lineup.slice(0,4).every(b=>!b.final));assert.equal(lineup[4].final,true);
    lineup.slice(0,4).forEach(b=>regular.add(b.id));finals.add(lineup[4].id);lineups.add(lineup.map(b=>b.id).join(','));
  }
  assert.ok(lineups.size>1);assert.equal(regular.size,12);assert.equal(finals.size,3);
});

test('five encounter policies retain exactly the existing difficulty progression',()=>{
  assert.deepEqual(G.difficulties,[
    {style:'greedy',skill:.15,discard:'none'},
    {style:'greedy',skill:.45,discard:'low'},
    {style:'greedy',skill:.75,discard:'none'},
    {style:'greedy',skill:1,discard:'none'},
    {style:'greedy',skill:1,discard:'expected'}
  ]);
});

test('Endless cycles contain all 15 once and prevent repeats after finals and across reshuffles',()=>{
  for(const final of G.bosses.filter(b=>b.final)){
    const random=G.rng(17);let previous=final.id;
    for(let round=0;round<3;round++){
      const cycle=G.bossCycle(previous,random);
      assert.equal(cycle.length,15);assert.equal(new Set(cycle.map(b=>b.id)).size,15);
      for(const boss of cycle){assert.notEqual(boss.id,previous);previous=boss.id;}
    }
  }
  // Force the collision branch using an identical fresh shuffle seed.
  const first=G.bossCycle(null,G.rng(3))[0].id;
  assert.notEqual(G.bossCycle(first,G.rng(3))[0].id,first);
});
