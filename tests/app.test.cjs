const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../engine.js');
const U = require('../upgrades.js');
// Exercise real UI event handlers without a browser dependency. Engine fixtures
// control outcomes so every run transition can be reached deterministically.
function setup(upgradeSystem = U, {autoFaceBoss = true, engine = G} = {}) {
  const elements = new Map(), timers = new Map(); let timerId = 0;
  const document = { getElementById:id=>elements.get(id), body:{classList:{add(){},remove(){}}}, activeElement:null };
  for (const id of ['rules-deck','rules-target','site-navigation','hand-result-overlay','hand-result-message','hand-result-announcement','app','rules','rules-toggle','rules-close','upgrades-toggle','upgrades-close','upgrades-dialog','upgrades-content']) elements.set(id,{ innerHTML:'', hidden:id==='hand-result-overlay', dataset:{}, open:false, attributes:{}, handlers:{}, addEventListener(type,fn){this.handlers[type]=fn;}, querySelector(){return null;}, setAttribute(key,value){this.attributes[key]=value;}, focus(){document.activeElement=this;}, showModal(){this.open=true;}, close(){this.open=false;this.handlers.close();} });
  const randomMath=Object.create(Math);randomMath.random=G.rng(42);
  const context = vm.createContext({ Math:randomMath, DMH:engine, DMHUpgrades:upgradeSystem, document, console, setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);} });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  const click = (action, card, upgrade, candidate, carry) => {
    elements.get('app').handlers.click({preventDefault(){},stopPropagation(){},target:{closest:()=>({disabled:false,dataset: carry !== undefined ? {carry:String(carry)} : candidate !== undefined ? {candidate:String(candidate)} : card === undefined ? {action,upgrade} : {card:String(card)}})}});
    // Existing table-mechanics fixtures enter the encounter automatically;
    // introduction-flow tests opt out and exercise the real intermediate screen.
    if(autoFaceBoss && read('run.phase')==='boss-intro')click('face-boss');
  };
  const read = expression => vm.runInContext(expression, context);
  return { context, click, read, elements, document, timers, html:()=>elements.get('app').innerHTML };
}
function fixture(ui, win, dismiss = true) {
  vm.runInContext(`{
    const good = [20,21,22,0,1], bad = [0,5,10,11,12];
    const hands = ${win ? '[good,bad]' : '[bad,good]'};
    state.sides = hands.map((hand,i)=>({hand:[...hand],pile:G.deck().filter(c=>!hand.includes(c)),out:[],discarded:false,discardAllowance:state.sides[i].discardAllowance ?? 1,discardsUsed:0}));
    state.bossCommitment=null;bossPlay = G.commitBossPlay(state,state.sides[1].hand.slice(0,3)); selected = []; discardWarning = false; render();
  }`,ui.context);
  const cards = ui.read('state.sides[0].hand.slice(0,3)');
  cards.forEach(c=>ui.click(undefined,c)); ui.click('play');
  if(dismiss)ui.read('dismissHandResult()');
}
function finishEncounter(ui, win, dismiss = true) {
  while(ui.read('state.winner')===null){
    if(ui.read('state.phase')==='reveal'){ui.read('dismissHandResult()');ui.click('next');}
    fixture(ui,win,dismiss);
  }
}
function claimFirst(ui) {
  if(ui.read('run.phase') !== 'upgrade') return;
  ui.click('select-upgrade',undefined,ui.read('run.offers[0]'));
  ui.click('claim-upgrade');
}

test('every character uses encounter difficulty, never identity, including Endless',()=>{
  const policies=[],engine={...G,aiTurn(state,index,policy,random){policies.push(policy);return G.aiTurn(state,index,policy,random);}};
  const ui=setup(U,{engine,autoFaceBoss:false});ui.click('start');
  for(let encounter=0;encounter<6;encounter++)for(let character=0;character<G.bosses.length;character++){
    ui.read(`bossIndex=${encounter};endless=${encounter>=5};if(bossIndex<5)run.lineup[bossIndex]=G.bosses[${character}];else run.endlessBoss=G.bosses[${character}];showBossIntroduction()`);
    const identity=ui.read('boss()');assert.ok(ui.html().includes(identity.artwork.src));assert.ok(ui.html().includes(identity.title));
    ui.click('face-boss');assert.equal(policies.at(-1),G.difficulties[Math.min(encounter,4)]);
    assert.ok(ui.html().includes(identity.artwork.src));assert.equal(ui.read('boss()'),identity);
  }
});

test('only the introduced identity is exposed, remains through results and rewards, and resets on New Run',()=>{
  const ui=setup(U,{autoFaceBoss:false});ui.click('start');
  const lineup=[...ui.read('run.lineup')],first=lineup[0];
  for(const next of lineup.slice(1))assert.ok(!ui.html().includes(next.artwork.src));
  ui.click('face-boss');fixture(ui,true);assert.equal(ui.read('boss()'),first);assert.ok(ui.html().includes(first.artwork.src));
  assert.ok(ui.read('log[0]').includes(first.name));finishEncounter(ui,true);
  assert.ok(ui.html().includes(first.artwork.src));ui.click('victory');assert.equal(ui.read('boss()'),first);
  claimFirst(ui);assert.equal(ui.read('boss()'),lineup[1]);assert.ok(ui.html().includes(lineup[1].artwork.src));
  ui.click('face-boss');ui.click('start');
  assert.equal(ui.read('Object.keys(run.upgrades).length'),0);assert.equal(ui.read('run.endlessRoster.length'),0);assert.equal(ui.read('run.endlessBoss'),null);
  assert.notEqual(ui.read('run.lineup'),lineup);assert.notDeepEqual([...ui.read('run.lineup')].map(b=>b.id),lineup.map(b=>b.id));
});

test('Endless progression consumes complete roster cycles once, with no boundary repeats or duplicate advancement',()=>{
  const ui=setup(U,{autoFaceBoss:false});ui.click('start');
  ui.read('bossIndex=4;run.upgrades=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));showBossIntroduction()');ui.click('face-boss');
  finishEncounter(ui,true);const final=ui.read('boss().id');ui.click('endless');
  let previous=final;const seen=[];
  for(let i=0;i<31;i++){
    const current=ui.read('boss().id');assert.notEqual(current,previous);seen.push(current);previous=current;
    assert.equal(ui.read('bossPolicy()'),G.difficulties[4]);assert.equal(ui.read('run.phase'),'boss-intro');
    const before=ui.read('JSON.stringify({run,bossIndex})');ui.click('victory');ui.click('claim-upgrade');assert.equal(ui.read('JSON.stringify({run,bossIndex})'),before);
    ui.click('face-boss');finishEncounter(ui,true);ui.click('victory');
  }
  assert.equal(new Set(seen.slice(0,15)).size,15);assert.equal(new Set(seen.slice(15,30)).size,15);
});

test('boss introduction starts at the selected boss and blocks all gameplay until a single Face activation', () => {
  const ui=setup(U,{autoFaceBoss:false});ui.click('start');
  assert.equal(ui.read('run.phase'),'boss-intro');assert.equal(ui.read('state'),null);assert.equal(ui.read('bossPlay'),null);
  assert.ok(ui.html().includes(ui.read('boss().artwork.src')));assert.ok(ui.html().includes(ui.read('boss().title')));
  assert.match(ui.html(),/01 <span class="progress-total">\/ 05/);assert.match(ui.html(),/>Face the Boss<\/button>/);
  assert.ok(ui.html().includes('>'+ui.read('boss().name')+'</h1>'));
  assert.doesNotMatch(ui.html(),/data-card=|data-action="play"|data-action="replace"/);assert.equal(ui.timers.size,0);
  const before=ui.read('JSON.stringify({run,state,bossIndex,endless})');
  for(const action of ['start','play','replace','next','victory','loss','endless','claim-upgrade','lucky-break','flexible-carry','read-table'])ui.click(action);
  ui.click(undefined,0);assert.equal(ui.read('JSON.stringify({run,state,bossIndex,endless})'),before);
  ui.click('face-boss');assert.equal(ui.read('run.phase'),'table');assert.equal(ui.read('state.phase'),'choose');
  assert.equal(ui.read('state.handNumber'),1);assert.equal(ui.read('state.sides[0].hand.length'),5);
  assert.equal(ui.read('state.bossCommitment.length'),3);assert.equal(ui.read('bossIndex'),0);
  const started=ui.read('JSON.stringify({run,state,bossPlay,bossIndex})');ui.click('face-boss');
  assert.equal(ui.read('JSON.stringify({run,state,bossPlay,bossIndex})'),started);
});

test('boss introduction follows each of the first four rewards and preserves upgrades until Face', () => {
  const ui=setup(U,{autoFaceBoss:false});ui.click('start');ui.click('face-boss');
  for(let b=0;b<4;b++){
    finishEncounter(ui,true);ui.click('victory');
    assert.equal(ui.read('run.phase'),'upgrade');claimFirst(ui);
    assert.equal(ui.read('bossIndex'),b+1);assert.equal(ui.read('run.phase'),'boss-intro');assert.equal(ui.read('state'),null);
    assert.ok(ui.html().includes(ui.read('boss().title')));
    assert.ok(ui.html().includes(ui.read('boss().name')));
    const upgrades=ui.read('JSON.stringify(run.upgrades)');
    ui.click('claim-upgrade');ui.click('victory');assert.equal(ui.read('bossIndex'),b+1);
    ui.click('face-boss');assert.equal(ui.read('JSON.stringify(run.upgrades)'),upgrades);
    assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),1+(ui.read('run.upgrades["quick-draw"]')||0));
  }
});

test('boss introduction follows the deferred final reward without changing Undertaker difficulty', () => {
  let calls=0;const ui=setup({...U,offer(...args){calls++;return U.offer(...args);}},{autoFaceBoss:false});
  ui.click('start');ui.read('bossIndex=4;showBossIntroduction()');ui.click('face-boss');
  finishEncounter(ui,true);assert.equal(ui.read('run.phase'),'complete');assert.equal(calls,0);
  ui.click('endless');assert.equal(ui.read('run.phase'),'upgrade');assert.equal(calls,1);claimFirst(ui);
  assert.equal(ui.read('run.phase'),'boss-intro');assert.equal(ui.read('state'),null);assert.equal(ui.read('bossIndex'),5);
  assert.match(ui.html(),/ENDLESS &middot; ENCOUNTER 6/);assert.doesNotMatch(ui.html(),/06.*\/ 05/);
  assert.ok(ui.html().includes(ui.read('boss().artwork.src')));assert.equal(ui.read('bossPolicy()'),G.difficulties[4]);
  const before=ui.read('JSON.stringify({run,bossIndex})');ui.click('endless');ui.click('claim-upgrade');
  assert.equal(ui.read('JSON.stringify({run,bossIndex})'),before);ui.click('face-boss');assert.equal(ui.read('run.phase'),'table');
});

test('boss introduction remains mandatory with exhausted rewards in initial and subsequent Endless encounters', () => {
  const ui=setup(U,{autoFaceBoss:false});ui.click('start');
  ui.read('run.upgrades=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));bossIndex=4;showBossIntroduction()');
  ui.click('face-boss');finishEncounter(ui,true);ui.click('endless');
  assert.equal(ui.read('run.phase'),'boss-intro');assert.equal(ui.read('bossIndex'),5);assert.equal(ui.read('state'),null);
  ui.click('face-boss');finishEncounter(ui,true);ui.click('victory');
  assert.equal(ui.read('run.phase'),'boss-intro');assert.equal(ui.read('bossIndex'),6);assert.equal(ui.read('run.offers.length'),0);
  assert.match(ui.html(),/ENDLESS &middot; ENCOUNTER 7/);ui.click('victory');assert.equal(ui.read('bossIndex'),6);
});

test('boss introduction returns to a new initial lineup with cleared upgrades after defeat or completed-run New Run', () => {
  for(const won of [false,true]){
    let calls=0;const ui=setup({...U,offer(...args){calls++;return U.offer(...args);}},{autoFaceBoss:false});
    ui.click('start');ui.read(`run.upgrades={'quick-draw':2};bossIndex=${won?4:2};showBossIntroduction()`);ui.click('face-boss');
    finishEncounter(ui,won);if(!won)ui.click('loss');ui.click('start');
    assert.equal(ui.read('run.phase'),'boss-intro');assert.equal(ui.read('state'),null);assert.equal(ui.read('bossIndex'),0);
    assert.equal(ui.read('Object.keys(run.upgrades).length'),0);assert.equal(ui.read('endless'),false);assert.equal(calls,0);
    assert.ok(ui.html().includes(ui.read('boss().artwork.src')));ui.click('face-boss');assert.equal(ui.read('state.sides[0].discardAllowance'),1);
  }
});

test('hand result overlay announces wins, losses and ties; its timer dismisses without advancing', () => {
  for(const outcome of ['win','loss','tie']){
    const ui=setup();ui.click('start');
    if(outcome==='tie'){
      ui.read('state.sides[1]=JSON.parse(JSON.stringify(state.sides[0]));state.bossCommitment=null;bossPlay=G.commitBossPlay(state,state.sides[1].hand.slice(0,3));render()');
      [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');
    }else fixture(ui,outcome==='win',false);
    const overlay=ui.elements.get('hand-result-overlay');
    const label=outcome==='win'?'HAND WON':outcome==='loss'?'HAND LOST':'DEAD HEAT';
    assert.equal(overlay.hidden,false);assert.equal(overlay.dataset.outcome,outcome);
    assert.equal(ui.elements.get('hand-result-announcement').textContent,label);
    assert.equal(ui.document.activeElement,overlay);assert.equal(ui.elements.get('app').inert,true);
    assert.match(ui.html(),/data-action="next"/);assert.match(ui.html(),/Your played cards/);
    assert.match(ui.html(),/Boss cards/);assert.match(ui.html(),/table-status result-/);
    const before=ui.read('JSON.stringify({state,run,bossIndex})');
    ui.click('next');ui.click('play');assert.equal(ui.read('JSON.stringify({state,run,bossIndex})'),before);
    assert.equal(ui.timers.size,1);const timer=[...ui.timers.values()][0];assert.equal(timer.delay,1400);
    timer.fn();assert.equal(overlay.hidden,true);assert.equal(ui.timers.size,0);
    assert.equal(ui.elements.get('app').inert,false);assert.equal(ui.elements.get('site-navigation').inert,false);
    assert.equal(ui.read('JSON.stringify({state,run,bossIndex})'),before);
    ui.read('dismissHandResult()');assert.equal(ui.read('state.handNumber'),1);
  }
});

test('hand result overlay supports immediate click and keyboard dismissal with no duplicate actions', () => {
  for(const key of [null,'Escape','Enter',' ']){
    const ui=setup();ui.click('start');fixture(ui,true,false);
    const overlay=ui.elements.get('hand-result-overlay'),timer=[...ui.timers.values()][0];
    const next={focus(){ui.document.activeElement=this;}};ui.elements.get('app').querySelector=selector=>selector==='[data-action="next"]'?next:null;
    let prevented=0,stopped=0;
    const event={key,preventDefault(){prevented++;},stopPropagation(){stopped++;}};
    const before=ui.read('JSON.stringify({state,run})');
    const dismiss=()=>overlay.handlers[key===null?'click':'keydown'](event);
    dismiss();assert.equal(overlay.hidden,true);assert.equal(ui.timers.size,0);
    assert.equal(ui.document.activeElement,next);dismiss();timer.fn();
    assert.equal(prevented,2);assert.equal(stopped,2);assert.equal(ui.read('JSON.stringify({state,run})'),before);
    ui.click('next');assert.equal(ui.read('state.handNumber'),2);
    assert.equal(ui.elements.get('hand-result-announcement').textContent,'');
  }
});

test('hand result overlay never interrupts boss victory, encounter defeat or final completion', () => {
  for(const won of [true,false]){
    const ui=setup();ui.click('start');finishEncounter(ui,won,false);
    assert.notEqual(ui.read('state.winner'),null);assert.equal(ui.elements.get('hand-result-overlay').hidden,true);
    assert.equal(ui.timers.size,0);assert.match(ui.html(),won?/Boss Defeated/:/Run Over/);
  }
  const ui=setup();ui.click('start');ui.read('bossIndex=4;state.wins=[G.rules.winsRequired-1,0]');fixture(ui,true,false);
  assert.equal(ui.read('run.phase'),'complete');assert.match(ui.html(),/Run Complete/);
  assert.equal(ui.elements.get('hand-result-overlay').hidden,true);assert.equal(ui.timers.size,0);
});

test('five encounters advance only on victory, finish screen offers optional endless, new run resets', () => {
  const ui = setup(); ui.click('start');
  for(let b=0;b<5;b++) {
    assert.ok(ui.html().includes(ui.read('boss().artwork.src')));
    assert.equal(ui.read('bossIndex'),b); assert.deepEqual([...ui.read('state.wins')],[0,0]);
    fixture(ui,true); assert.equal(ui.read('state.winner'),null); ui.click('next');
    finishEncounter(ui,true); assert.equal(ui.read('state.winner'),0); ui.click('victory'); claimFirst(ui);
  }
  assert.match(ui.html(),/Run Complete/); assert.match(ui.html(),/Endless Mode/);
  ui.click('endless'); assert.equal(ui.read('run.phase'),'upgrade'); claimFirst(ui);
  assert.equal(ui.read('bossIndex'),5); assert.equal(ui.read('endless'),true);
  assert.match(ui.html(),/ENDLESS &middot; ENCOUNTER 6/); assert.ok(ui.html().includes(ui.read('boss().name')));assert.ok(ui.html().includes(ui.read('boss().artwork.src')));
  finishEncounter(ui,true); ui.click('victory'); claimFirst(ui);
  assert.equal(ui.read('bossIndex'),6);
  ui.click('start'); assert.equal(ui.read('bossIndex'),0); assert.equal(ui.read('endless'),false);
});
test('one encounter defeat ends run and retry starts from boss one', () => {
  const ui = setup(); ui.click('start'); finishEncounter(ui,false);
  assert.equal(ui.read('state.winner'),1); assert.match(ui.html(),/Run Over/);
  ui.click('loss'); assert.match(ui.html(),/The house remembers/); assert.match(ui.html(),/0 bosses defeated/);
  ui.click('start'); assert.deepEqual([...ui.read('state.wins')],[0,0]); assert.equal(ui.read('bossIndex'),0);
});

test('bosses one to four reward normally; final victory defers offer generation and cannot be skipped or claimed twice', () => {
  let offersGenerated=0;
  const ui=setup({...U,offer(...args){offersGenerated++;return U.offer(...args);}});ui.click('start');
  for(let b=0;b<4;b++){
    finishEncounter(ui,true);
    assert.equal(ui.read('run.phase'),'table');ui.click('victory');
    assert.equal(ui.read('run.phase'),'upgrade');assert.equal(offersGenerated,b+1);
    assert.equal(ui.read('bossIndex'),b);claimFirst(ui);assert.equal(ui.read('bossIndex'),b+1);
  }
  const collection=ui.read('JSON.stringify(run.upgrades)');
  finishEncounter(ui,true);
  assert.equal(ui.read('run.phase'),'complete');assert.match(ui.html(),/Run Complete/);
  assert.doesNotMatch(ui.html(),/upgrade-choice|claim-upgrade/);assert.equal(offersGenerated,4);
  assert.equal(ui.read('JSON.stringify(run.upgrades)'),collection);assert.equal(ui.read('run.offers.length'),0);
  const complete=ui.read('JSON.stringify({run,bossIndex,endless,state})');
  for(const action of ['victory','claim-upgrade','next','play'])ui.click(action);
  ui.click('select-upgrade',undefined,'quick-draw');
  assert.equal(ui.read('JSON.stringify({run,bossIndex,endless,state})'),complete);
  ui.click('endless');assert.equal(offersGenerated,5);assert.equal(ui.read('run.phase'),'upgrade');
  assert.equal(ui.read('bossIndex'),4);assert.equal(ui.read('JSON.stringify(run.upgrades)'),collection);
  const offers=[...ui.read('run.offers')];
  assert.ok(offers.every(id=>U.eligible(ui.read('run.upgrades')).some(d=>d.id===id)));
  for(const action of ['endless','victory','claim-upgrade','next'])ui.click(action);
  assert.equal(offersGenerated,5);assert.deepEqual([...ui.read('run.offers')],offers);
  const id=offers[0],before=ui.read('run.upgrades')[id]||0;
  ui.click('select-upgrade',undefined,id);ui.click('claim-upgrade');
  assert.equal(ui.read('run.upgrades')[id],before+1);assert.equal(ui.read('bossIndex'),5);
  assert.equal(ui.read('run.phase'),'table');assert.equal(ui.read('bossPolicy()'),G.difficulties[4]);
  const started=ui.read('JSON.stringify({run,bossIndex,endless,state})');
  for(const action of ['endless','victory','claim-upgrade'])ui.click(action);
  assert.equal(ui.read('JSON.stringify({run,bossIndex,endless,state})'),started);assert.equal(offersGenerated,5);
});

test('new run abandons the final reward without generating it and clears collected upgrades', () => {
  let calls=0;const ui=setup({...U,offer(...args){calls++;return U.offer(...args);}});ui.click('start');
  ui.read('bossIndex=4;run.upgrades={"quick-draw":2,"last-stand":1};startEncounter()');
  finishEncounter(ui,true);assert.equal(ui.read('run.phase'),'complete');
  assert.equal(calls,0);ui.click('start');
  assert.equal(ui.read('bossIndex'),0);assert.equal(ui.read('run.phase'),'table');assert.equal(ui.read('endless'),false);
  assert.equal(ui.read('Object.keys(run.upgrades).length'),0);assert.equal(ui.read('run.offers.length'),0);
  assert.equal(ui.read('run.selectedUpgrade'),null);assert.equal(ui.read('state.sides[0].discardAllowance'),1);
  ui.click('endless');ui.click('claim-upgrade');assert.equal(calls,0);assert.equal(ui.read('bossIndex'),0);
});

test('an exhausted pool still shows completion first and skips reward selection only after Endless', () => {
  let calls=0;const ui=setup({...U,offer(...args){calls++;return U.offer(...args);}});ui.click('start');
  ui.read('bossIndex=4;run.upgrades=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));startEncounter()');
  const collection=ui.read('JSON.stringify(run.upgrades)');finishEncounter(ui,true);
  assert.equal(ui.read('run.phase'),'complete');assert.match(ui.html(),/Run Complete/);assert.equal(calls,0);
  ui.click('endless');assert.equal(calls,1);assert.equal(ui.read('bossIndex'),5);assert.equal(ui.read('run.phase'),'table');
  assert.equal(ui.read('run.offers.length'),0);assert.equal(ui.read('JSON.stringify(run.upgrades)'),collection);
  assert.equal(ui.read('bossPolicy()'),G.difficulties[4]);assert.match(ui.html(),/ENDLESS &middot; ENCOUNTER 6/);
  ui.click('endless');ui.click('claim-upgrade');assert.equal(calls,1);assert.equal(ui.read('bossIndex'),5);
});
test('selecting and deselecting cards, discarding a selection and playing afterward', () => {
  const ui=setup();ui.click('start');const card=ui.read('state.sides[0].hand[0]');
  ui.click(undefined,card);ui.click(undefined,card);assert.equal(ui.read('selected.length'),0);
  ui.click('replace');assert.match(ui.html(),/Select a card to discard first/);
  ui.click(undefined,card);ui.click('play');assert.equal(ui.read('state.phase'),'choose');
  const bossBefore=ui.read('JSON.stringify({side:state.sides[1],bossPlay})');
  ui.click('replace');
  assert.equal(ui.read('selected.length'),0);assert.equal(ui.read('state.sides[0].discarded'),true);
  assert.equal(ui.read('state.sides[0].out.includes('+card+')'),true);
  assert.equal(ui.read('JSON.stringify({side:state.sides[1],bossPlay})'),bossBefore);
  assert.match(ui.html(),/data-action="replace"[^>]*disabled/);assert.match(ui.html(),/aria-label="Discard; 0 remaining"/);
  const after=ui.read('JSON.stringify(state)');ui.click('replace');assert.equal(ui.read('JSON.stringify(state)'),after);
  [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');
  assert.equal(ui.read('state.phase'),'reveal');
});

test('too many selected cards warn without mutation and can be corrected immediately', () => {
  const ui=setup();ui.click('start');const cards=[...ui.read('state.sides[0].hand')];
  cards.forEach(c=>ui.click(undefined,c));assert.equal(ui.read('selected.length'),5);
  const before=ui.read('JSON.stringify({state,bossPlay})');ui.click('replace');
  assert.equal(ui.read('JSON.stringify({state,bossPlay})'),before);
  assert.equal(ui.read('selected.length'),5);assert.equal(ui.read('discardWarning'),true);
  assert.equal((ui.html().match(/discard-warning/g)||[]).length,5);
  assert.match(ui.html(),/You can only discard 1 card/);
  cards.slice(1).forEach(c=>ui.click(undefined,c));assert.equal(ui.read('discardWarning'),false);
  ui.click('replace');assert.equal(ui.read('state.sides[0].out.length'),1);
});

test('three selected cards play without discarding, including after a rejected discard', () => {
  for(const attemptDiscard of [false,true]){
    const ui=setup();ui.click('start');
    [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));
    if(attemptDiscard)ui.click('replace');
    ui.click('play');assert.equal(ui.read('state.phase'),'reveal');
    assert.equal(ui.read('state.sides[0].out.length'),3);assert.equal(ui.read('state.sides[0].hand.length'),2);
    assert.equal(ui.read('state.sides[0].discarded'),false);
  }
});

test('future larger allowances support batch and sequential discards without granting upgrades', () => {
  for(const batch of [true,false]){
    const ui=setup();ui.click('start');vm.runInContext('state.sides[0].discardAllowance=2;render()',ui.context);
    assert.match(ui.html(),/aria-label="Discard; 2 remaining"/);
    const cards=[...ui.read('state.sides[0].hand.slice(0,2)')];
    if(batch){cards.forEach(c=>ui.click(undefined,c));ui.click('replace');}
    else {for(const card of cards){ui.click(undefined,card);ui.click('replace');}}
    assert.equal(ui.read('state.sides[0].out.length'),2);assert.equal(ui.read('selected.length'),0);
    assert.equal(ui.read('state.sides[0].pile.length'),G.deck().length-7);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),0);
    assert.match(ui.html(),/data-action="replace"[^>]*disabled/);
  }
});

test('rules modal opens and closes without changing selections or encounter state', () => {
  const ui=setup(); ui.click('start');
  ui.click(undefined,ui.read('state.sides[0].hand[0]'));
  const before=ui.read('JSON.stringify({state,selected,bossPlay,bossIndex,endless})');
  ui.elements.get('rules-toggle').handlers.click();
  assert.equal(ui.elements.get('rules').open,true);
  assert.equal(ui.elements.get('rules-toggle').attributes['aria-expanded'],'true');
  assert.equal(ui.document.activeElement,ui.elements.get('rules-close'));
  ui.elements.get('rules-close').handlers.click();
  assert.equal(ui.elements.get('rules').open,false);
  assert.equal(ui.elements.get('rules-toggle').attributes['aria-expanded'],'false');
  assert.equal(ui.document.activeElement,ui.elements.get('rules-toggle'));
  assert.equal(ui.read('JSON.stringify({state,selected,bossPlay,bossIndex,endless})'),before);
});

test('poster header keeps progress while hand counting continues without a visible indicator', () => {
  const ui=setup();ui.click('start');
  assert.match(ui.read('pathMarkup()'),/01 <span class="progress-total">\/ 05/);
  assert.ok(ui.html().includes('alt="'+ui.read('boss().name')+', Western wanted poster"'));
  assert.ok(ui.html().includes('<h2 class="boss-fallback" hidden>'+ui.read('boss().name')+'</h2>'));
  assert.equal(ui.read("state.handNumber"),1);assert.doesNotMatch(ui.html(),/class="score-hand"/);
  vm.runInContext('state.handNumber=4;render()',ui.context);
  assert.equal(ui.read("state.handNumber"),4);assert.doesNotMatch(ui.html(),/class="score-hand"/);
  assert.doesNotMatch(ui.html(),/Hand 4\/3|boss-path/);
  fixture(ui,true);assert.match(ui.html(),/Boss: 2 of 3 chips remaining/);ui.click('next');
  assert.equal(ui.read("state.handNumber"),5);assert.doesNotMatch(ui.html(),/class="score-hand"/);
  finishEncounter(ui,true);ui.click('victory'); claimFirst(ui);
  assert.match(ui.read('pathMarkup()'),/02 <span class="progress-total">\/ 05/);
});

test('discard illuminates only for valid selections without blocking invalid attempts', () => {
  const ui=setup();ui.click('start');const cards=[...ui.read('state.sides[0].hand')];
  assert.match(ui.html(),/class="secondary" data-action="replace"/);
  assert.doesNotMatch(ui.html(),/Choose three|Ready to play|selection-info/);
  ui.click(undefined,cards[0]);assert.match(ui.html(),/class="primary" data-action="replace"/);
  ui.click(undefined,cards[1]);assert.match(ui.html(),/class="secondary" data-action="replace"/);
  assert.doesNotMatch(ui.html(),/data-action="replace"[^>]*disabled/);
  ui.click('replace');assert.match(ui.html(),/You can only discard 1 card/);
  ui.click(undefined,cards[1]);ui.click('replace');
  assert.equal(ui.read('selected.length'),0);assert.match(ui.html(),/class="secondary" data-action="replace"[^>]*disabled/);
});

test('chips track the opposing hand wins; ties consume no chips', () => {
  const ui=setup();ui.click('start');
  assert.equal((ui.html().match(/class="poker-chip"/g)||[]).length,6);
  fixture(ui,true);
  assert.match(ui.read('scoreChips(0)'),/You: 3 of 3 chips remaining/);
  assert.match(ui.read('scoreChips(1)'),/Boss: 2 of 3 chips remaining/);
  ui.click('next');fixture(ui,false);
  assert.match(ui.read('scoreChips(0)'),/You: 2 of 3 chips remaining/);
  assert.match(ui.read('scoreChips(1)'),/Boss: 2 of 3 chips remaining/);
  ui.click('next');
  vm.runInContext('state.sides[1]=JSON.parse(JSON.stringify(state.sides[0]));state.bossCommitment=null;bossPlay=G.commitBossPlay(state,state.sides[1].hand.slice(0,3));selected=[];render()',ui.context);
  const before=ui.read('scoreChips(0)+scoreChips(1)');
  [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');
  assert.equal(ui.read('state.last.result'),0);assert.equal(ui.read('scoreChips(0)+scoreChips(1)'),before);
});

test('instructions and chip counts follow the reversible central encounter settings',()=>{
  for(const legacy of [false,true]){
    const source=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
    const module={exports:{}};
    new Function('module',legacy?source.replace('lowestRank: 8, winsRequired: 3','lowestRank: 9, winsRequired: 2'):source)(module);
    const engine=module.exports,ui=setup(U,{engine});ui.click('start');
    assert.equal((ui.html().match(/class="poker-chip"/g)||[]).length,2*engine.rules.winsRequired);
    assert.ok(ui.elements.get('rules-deck').innerHTML.includes(engine.deck().length+'-card deck'));
    assert.ok(ui.elements.get('rules-target').textContent.includes('win '+engine.rules.winsRequired+' hands'));
  }
});

test('Play button names all six evaluated hand types and defaults otherwise', () => {
  const triples=[[20,13,2],[0,1,20],[0,8,20],[0,5,10],[0,1,2],[0,4,8]];
  const names=['High Card','Pair','Flush','Straight','Three of a Kind','Straight Flush'];
  const ui=setup();ui.click('start');
  triples.forEach((cards,i)=>{
    vm.runInContext(`state.sides[0].hand=${JSON.stringify([...cards,...G.deck().filter(c=>!cards.includes(c)).slice(0,2)])};selected=${JSON.stringify(cards)};render()`,ui.context);
    assert.ok(ui.html().includes('>Play '+names[i]+'</button>'));
  });
  vm.runInContext('selected=[];render()',ui.context);assert.match(ui.html(),/>Play Three<\/button>/);
  vm.runInContext('selected=state.sides[0].hand.slice(0,4);render()',ui.context);assert.match(ui.html(),/>Play Three<\/button>/);
});

test('milestone screens replace ended tables and keep immediate, guarded continuation buttons', () => {
  for(const won of [true,false]){
    const ui=setup();ui.click('start');fixture(ui,won);
    assert.match(ui.html(),new RegExp('table-status result-'+(won?'win':'loss')));
    finishEncounter(ui,won);
    assert.match(ui.html(),new RegExp('milestone milestone-'+(won?'boss':'loss')));
    assert.match(ui.html(),won?/>Boss Defeated<\//:/>Run Over<\//);
    if(won){assert.doesNotMatch(ui.html(),/class="milestone-subtitle"/);assert.match(ui.html(),/class="defeat-mark"/);}
    else {assert.ok(ui.html().includes('Defeated by '+ui.read('boss().name')));assert.doesNotMatch(ui.html(),/class="defeat-mark"/);}
    assert.ok(ui.html().includes(ui.read('boss().artwork.src')));
    assert.doesNotMatch(ui.html(),/class="poker-chip|Card table|Your played cards|data-action="next"/);
    assert.match(ui.html(),won?/>Choose Upgrade<\/button>/:/>Run Summary<\/button>/);
    assert.doesNotMatch(ui.html(),/disabled/);assert.equal(ui.elements.get('hand-result-overlay').hidden,true);
    assert.equal(ui.read('run.phase'),'table');assert.equal(ui.read('bossIndex'),0);
    ui.click(won?'victory':'loss');
    assert.equal(ui.read('run.phase'),won?'upgrade':'defeat');
    const after=ui.read('JSON.stringify({run,state,bossIndex})');ui.click(won?'victory':'loss');
    assert.equal(ui.read('JSON.stringify({run,state,bossIndex})'),after);
    if(!won)assert.match(ui.html(),/The house remembers/);
  }
});

test('reward selection gates advancement, claims once and retains collection with enabled passives', () => {
  const ui=setup();ui.click('start');finishEncounter(ui,true);
  ui.click('victory');assert.equal(ui.read('run.phase'),'upgrade');assert.equal(ui.read('bossIndex'),0);
  const offers=[...ui.read('run.offers')];assert.equal(offers.length,3);assert.equal(new Set(offers).size,3);
  assert.match(ui.html(),/data-action="claim-upgrade" disabled/);
  assert.doesNotMatch(ui.html(),/data-action="play"|data-card=|class="score-hand"/);
  ui.click('claim-upgrade');ui.click('victory');ui.click('next');
  ui.click('select-upgrade',undefined,'not-offered');
  assert.equal(ui.read('bossIndex'),0);assert.equal(ui.read('run.selectedUpgrade'),null);
  ui.click('select-upgrade',undefined,offers[0]);assert.equal(ui.read('run.selectedUpgrade'),offers[0]);
  assert.match(ui.html(),/chosen/);assert.match(ui.html(),/>Claim your reward<\/h1>/);assert.doesNotMatch(ui.html(),/All six upgrades are enabled|class="upgrade-meta"|class="eyebrow"/);
  ui.elements.get('upgrades-toggle').handlers.click();
  assert.match(ui.elements.get('upgrades-content').innerHTML,/No upgrades collected yet/);
  ui.elements.get('upgrades-close').handlers.click();
  assert.deepEqual([...ui.read('run.offers')],offers);
  ui.click('claim-upgrade');assert.equal(ui.read('bossIndex'),1);assert.equal(ui.read('run.upgrades')[offers[0]],1);
  ui.click('claim-upgrade');assert.equal(ui.read('run.upgrades')[offers[0]],1);
  assert.equal(ui.read('state.sides[0].discardAllowance'),offers[0]==='quick-draw'?2:1);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),offers[0]==='quick-draw'?2:1);
  assert.equal(ui.read('state.sides[0].hand.length'),5);
  ui.click('start');assert.equal(Object.keys(ui.read('run.upgrades')).length,0);
});

test('repeat rewards show improvements; endless advances normally when every upgrade is maxed', () => {
  const ui=setup();ui.click('start');
  const max=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));max['quick-draw']=1;
  vm.runInContext(`run.upgrades=${JSON.stringify(max)};endless=true;bossIndex=5;run.endlessBoss=run.lineup[0]`,ui.context);
  finishEncounter(ui,true);ui.click('victory');
  assert.deepEqual([...ui.read('run.offers')],['quick-draw']);assert.match(ui.html(),/aria-label="Quick Draw; Improve from Level 1 to 2"/);
  claimFirst(ui);assert.equal(ui.read('run.upgrades["quick-draw"]'),2);assert.equal(ui.read('bossIndex'),6);
  assert.equal(ui.read('state.sides[0].discardAllowance'),3);
  finishEncounter(ui,true);ui.click('victory');
  assert.equal(ui.read('bossIndex'),7);assert.equal(ui.read('run.phase'),'table');
  assert.equal(Object.keys(ui.read('run.upgrades')).length,6);
  finishEncounter(ui,false);ui.click('loss');
  assert.match(ui.html(),/The house remembers/);ui.click('start');
  assert.equal(Object.keys(ui.read('run.upgrades')).length,0);assert.equal(ui.read('endless'),false);
});

test('Quick Draw run levels drive counters, illumination, batch/sequential use and new-run reset', () => {
  for(const level of [1,2]) for(const batch of [true,false]){
    const ui=setup();ui.click('start');
    vm.runInContext(`run.upgrades={'quick-draw':${level}};startEncounter()`,ui.context);
    const count=level+1,cards=[...ui.read('state.sides[0].hand')];
    assert.match(ui.html(),new RegExp('aria-label="Discard; '+count+' remaining"'));
    cards.slice(0,count+1).forEach(c=>ui.click(undefined,c));const before=ui.read('JSON.stringify(state)');
    ui.click('replace');assert.equal(ui.read('JSON.stringify(state)'),before);assert.match(ui.html(),new RegExp('only discard '+count+' cards'));
    cards.forEach(c=>{if(ui.read('selected.includes('+c+')'))ui.click(undefined,c);});
    if(batch){cards.slice(0,count).forEach(c=>ui.click(undefined,c));assert.match(ui.html(),/class="primary" data-action="replace"/);ui.click('replace');}
    else cards.slice(0,count).forEach(c=>{ui.click(undefined,c);ui.click('replace');});
    assert.equal(ui.read('selected.length'),0);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),0);
    assert.equal(ui.read('state.sides[0].out.length'),count);assert.match(ui.html(),/data-action="replace"[^>]*disabled/);
    [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');ui.read('dismissHandResult()');ui.click('next');
    assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),count);assert.equal(ui.read('state.sides[1].discardAllowance'),1);
    ui.click('start');assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),1);
  }
});

test('insufficient draw supply gives a specific warning and preserves selection, cards and allowance', () => {
  const ui=setup();ui.click('start');
  vm.runInContext('run.upgrades={"quick-draw":2};startEncounter();state.sides[0].out.push(...state.sides[0].pile.splice(1));render()',ui.context);
  [...ui.read('state.sides[0].hand.slice(0,2)')].forEach(c=>ui.click(undefined,c));
  assert.match(ui.html(),/aria-label="Discard; 3 remaining"/);assert.match(ui.html(),/class="secondary" data-action="replace"/);
  const before=ui.read('JSON.stringify({state,selected,bossPlay})');ui.click('replace');
  assert.equal(ui.read('JSON.stringify({state,selected,bossPlay})'),before);assert.match(ui.html(),/Only 1 card remains in your draw pile/);
  ui.click(undefined,ui.read('selected[1]'));ui.click('replace');
  assert.equal(ui.read('state.sides[0].pile.length'),0);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),2);
  assert.match(ui.html(),/data-action="replace"[^>]*disabled/);assert.match(ui.html(),/Your draw pile is empty/);
});

test('Quick Draw can be skipped before playing three and collection labels only implemented upgrades as enabled', () => {
  const ui=setup();ui.click('start');
  vm.runInContext('run.upgrades=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));startEncounter()',ui.context);
  const markup=ui.read('upgradeCollectionMarkup()');assert.equal((markup.match(/Enabled/g)||[]).length,6);assert.equal((markup.match(/Not yet implemented/g)||[]).length,0);
  assert.match(markup,/Three discards per hand/);
  [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');
  assert.equal(ui.read('state.phase'),'reveal');assert.equal(ui.read('state.sides[0].out.length'),3);assert.equal(ui.read('state.sides[0].discardsUsed'),0);
});

test('Lucky Break requires a confirmed candidate, blocks table actions and works with Quick Draw', () => {
  const ui=setup();ui.click('start');assert.doesNotMatch(ui.html(),/data-action="lucky-break"/);
  vm.runInContext('run.upgrades={"lucky-break":2,"quick-draw":2};startEncounter()',ui.context);
  assert.match(ui.html(),/Lucky Break; 2 uses remaining/);
  const bossBefore=ui.read('JSON.stringify({bossPlay,side:state.sides[1]})');
  ui.click(undefined,ui.read('state.sides[0].hand[0]'));ui.click('lucky-break');
  assert.equal(ui.read('state.phase'),'lucky-break');assert.equal(ui.read('state.sides[0].hand.length'),4);
  assert.doesNotMatch(ui.html(),/data-action="play"|data-action="replace"/);
  assert.match(ui.html(),/data-action="lucky-confirm" disabled/);
  const pending=ui.read('JSON.stringify(state)');
  for(const action of ['play','replace','next','victory','loss','start','lucky-break','lucky-confirm'])ui.click(action);
  assert.equal(ui.read('JSON.stringify(state)'),pending);
  ui.click(undefined,undefined,undefined,99);assert.equal(ui.read('luckyCandidate'),null);
  const candidates=[...ui.read('state.luckyBreak.pending.candidates')];
  ui.click(undefined,undefined,undefined,candidates[0]);assert.equal(ui.read('luckyCandidate'),candidates[0]);
  assert.doesNotMatch(ui.html(),/data-action="lucky-confirm" disabled/);
  ui.click('lucky-confirm');assert.equal(ui.read('state.phase'),'choose');assert.equal(ui.read('selected.length'),0);
  assert.equal(ui.read('state.sides[0].hand.length'),5);assert.equal(ui.read('state.sides[0].out.includes('+candidates[1]+')'),true);
  assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),2);assert.equal(ui.read('state.luckyBreak.remaining'),1);
  assert.equal(ui.read('JSON.stringify({bossPlay,side:state.sides[1]})'),bossBefore);
  [...ui.read('state.sides[0].hand.slice(0,2)')].forEach(c=>ui.click(undefined,c));ui.click('replace');
  assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),0);
  [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');ui.read('dismissHandResult()');ui.click('next');
  assert.equal(ui.read('state.luckyBreak.remaining'),1);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),3);
  vm.runInContext('state.wins=[0,0]',ui.context);
  finishEncounter(ui,true);ui.click('victory');claimFirst(ui);
  assert.equal(ui.read('run.upgrades["lucky-break"]'),2);assert.equal(ui.read('state.luckyBreak.remaining'),2);
  ui.click('start');assert.equal(ui.read('state.luckyBreak.remaining'),0);assert.doesNotMatch(ui.html(),/data-action="lucky-break"/);
});

test('Lucky Break invalid activation preserves every card and counter', () => {
  const ui=setup();ui.click('start');
  vm.runInContext('run.upgrades={"lucky-break":1};startEncounter()',ui.context);
  const before=ui.read('JSON.stringify(state)');ui.click('lucky-break');assert.equal(ui.read('JSON.stringify(state)'),before);
  [...ui.read('state.sides[0].hand.slice(0,2)')].forEach(c=>ui.click(undefined,c));ui.click('lucky-break');assert.equal(ui.read('JSON.stringify(state)'),before);
  ui.click(undefined,ui.read('selected[1]'));
  vm.runInContext('state.sides[0].out.push(...state.sides[0].pile.splice(1));render()',ui.context);
  const depleted=ui.read('JSON.stringify(state)');ui.click('lucky-break');assert.equal(ui.read('JSON.stringify(state)'),depleted);
});

test('Flexible Carry is optional between hands, locks its choice and retains upgrade state across bosses', () => {
  const ui=setup();ui.click('start');
  vm.runInContext('run.upgrades={"flexible-carry":2,"quick-draw":2,"lucky-break":2};startEncounter()',ui.context);
  assert.doesNotMatch(ui.html(),/data-action="flexible-carry"/);fixture(ui,true);
  assert.match(ui.html(),/data-action="flexible-carry"/);assert.match(ui.html(),/2 left/);
  ui.click('next');assert.equal(ui.read('state.flexibleCarry.remaining'),2);
  vm.runInContext('state.wins=[0,0]',ui.context);fixture(ui,true);
  const luckyBefore=ui.read('state.luckyBreak.remaining');ui.click('flexible-carry');
  assert.equal(ui.read('state.phase'),'flexible-carry');assert.equal((ui.html().match(/data-carry=/g)||[]).length,6);
  assert.match(ui.html(),/data-action="carry-confirm" disabled/);assert.doesNotMatch(ui.html(),/data-action="play"/);
  const before=ui.read('JSON.stringify(state)');
  for(const action of ['play','next','replace','lucky-break','victory','start','carry-confirm'])ui.click(action);
  assert.equal(ui.read('JSON.stringify(state)'),before);
  ui.click(undefined,undefined,undefined,undefined,99);assert.equal(ui.read('carryCandidate'),null);
  const discarded=ui.read('state.sides[0].hand[0]');ui.click(undefined,undefined,undefined,undefined,discarded);ui.click('carry-confirm');
  assert.equal(ui.read('state.phase'),'choose');assert.equal(ui.read('state.sides[0].hand.length'),5);assert.equal(ui.read('selected.length'),0);
  assert.equal(ui.read('state.luckyBreak.remaining'),luckyBefore);assert.equal(ui.read('state.flexibleCarry.remaining'),1);
  assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),3);
  finishEncounter(ui,true);assert.equal(ui.read('state.winner'),0);assert.doesNotMatch(ui.html(),/data-action="flexible-carry"/);
  ui.click('victory');assert.equal(ui.read('run.phase'),'upgrade');assert.doesNotMatch(ui.html(),/data-action="flexible-carry"/);
  claimFirst(ui);assert.equal(ui.read('run.upgrades["flexible-carry"]'),2);assert.equal(ui.read('state.flexibleCarry.remaining'),2);
  ui.click('start');assert.equal(ui.read('state.flexibleCarry.remaining'),0);
});

test('Flexible Carry is absent after defeat and when normal refill needs fresh decks', () => {
  const ui=setup();ui.click('start');vm.runInContext('run.upgrades={"flexible-carry":1};startEncounter()',ui.context);
  fixture(ui,true);vm.runInContext('state.sides[1].out.push(...state.sides[1].pile.splice(2));render()',ui.context);
  assert.doesNotMatch(ui.html(),/data-action="flexible-carry"/);const before=ui.read('JSON.stringify(state)');ui.click('flexible-carry');assert.equal(ui.read('JSON.stringify(state)'),before);
  ui.click('next');assert.equal(ui.read('state.refreshes'),1);assert.equal(ui.read('state.flexibleCarry.remaining'),1);
  vm.runInContext('state.wins=[0,G.rules.winsRequired-1]',ui.context);fixture(ui,false);
  assert.doesNotMatch(ui.html(),/data-action="flexible-carry"/);ui.click('loss');assert.doesNotMatch(ui.html(),/data-action="flexible-carry"/);
});

test('Read the Table reveals only committed ranks on five backs and preserves selection and boss decisions', () => {
  for(const level of [1,2]){
    const ui=setup();ui.click('start');assert.doesNotMatch(ui.html(),/data-action="read-table"/);
    vm.runInContext(`run.upgrades={'read-the-table':${level},'quick-draw':2,'lucky-break':2};startEncounter()`,ui.context);
    const bossBefore=ui.read('JSON.stringify({bossPlay,side:state.sides[1],commitment:state.bossCommitment})');
    ui.click(undefined,ui.read('state.sides[0].hand[0]'));const selectedBefore=ui.read('JSON.stringify(selected)');
    ui.click('read-table');
    assert.equal(ui.read('state.readTheTable.reveals.length'),level);assert.equal(ui.read('state.readTheTable.remaining'),0);
    assert.equal(ui.read('JSON.stringify(selected)'),selectedBefore);
    assert.equal(ui.read('JSON.stringify({bossPlay,side:state.sides[1],commitment:state.bossCommitment})'),bossBefore);
    const backs=ui.read('backs()');assert.equal((backs.match(/class="card back/g)||[]).length,5);
    assert.equal((backs.match(/rank-known/g)||[]).length,level);
    assert.equal((backs.match(/aria-label="Hidden card"/g)||[]).length,5-level);
    assert.doesNotMatch(backs,/data-card|class="pip"|class="corner"|hearts|diamonds|clubs|spades/);
    for(const info of ui.read('state.readTheTable.reveals'))assert.ok(backs.includes('Rank '+info.rank+'; suit hidden'));
    const revealed=ui.read('JSON.stringify(state.readTheTable.reveals)');ui.click('read-table');assert.equal(ui.read('JSON.stringify(state.readTheTable.reveals)'),revealed);
    ui.click('replace');assert.equal(ui.read('JSON.stringify(state.readTheTable.reveals)'),revealed);
    ui.click(undefined,ui.read('state.sides[0].hand[0]'));ui.click('lucky-break');
    ui.click(undefined,undefined,undefined,ui.read('state.luckyBreak.pending.candidates[0]'));ui.click('lucky-confirm');
    assert.equal(ui.read('JSON.stringify(state.readTheTable.reveals)'),revealed);
    [...ui.read('state.sides[0].hand.slice(0,3)')].forEach(c=>ui.click(undefined,c));ui.click('play');
    assert.deepEqual([...ui.read('state.last.plays[1]')],[...ui.read('state.bossCommitment')]);
    ui.read('dismissHandResult()');ui.click('next');assert.equal(ui.read('state.readTheTable.remaining'),0);assert.equal(ui.read('state.readTheTable.reveals.length'),0);
    assert.match(ui.html(),/data-action="read-table"[^>]*disabled/);
    vm.runInContext('state.wins=[0,0]',ui.context);finishEncounter(ui,true);ui.click('victory');claimFirst(ui);
    assert.equal(ui.read('run.upgrades["read-the-table"]')>=level,true);assert.equal(ui.read('state.readTheTable.remaining'),1);
    ui.click('start');assert.equal(ui.read('state.readTheTable.remaining'),0);assert.doesNotMatch(ui.html(),/data-action="read-table"/);
  }
});

test('Last Stand counter and small indicator activate next hand, not on the losing showdown', () => {
  const ui=setup();ui.click('start');vm.runInContext('run.upgrades={"last-stand":1,"quick-draw":1};startEncounter()',ui.context);
  assert.doesNotMatch(ui.html(),/Last Stand active/);fixture(ui,false);
  assert.equal(ui.read('state.wins[1]'),1);assert.equal(ui.read('state.sides[0].discardAllowance'),2);assert.doesNotMatch(ui.html(),/Last Stand active/);
  ui.click('next');assert.doesNotMatch(ui.html(),/Last Stand active/);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),2);fixture(ui,false);assert.doesNotMatch(ui.html(),/Last Stand active/);ui.click('next');assert.match(ui.html(),/Last Stand active/);assert.match(ui.html(),/aria-label="Discard; 4 remaining"/);
  const cards=[...ui.read('state.sides[0].hand')];cards.forEach(c=>ui.click(undefined,c));const before=ui.read('JSON.stringify(state)');
  ui.click('replace');assert.equal(ui.read('JSON.stringify(state)'),before);assert.match(ui.html(),/only discard 4 cards/);
  ui.click(undefined,cards[4]);assert.match(ui.html(),/class="primary" data-action="replace"/);ui.click('replace');
  assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),0);assert.match(ui.html(),/data-action="replace"[^>]*disabled/);
  fixture(ui,true);ui.click('next');assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),4);assert.match(ui.html(),/Last Stand active/);
  finishEncounter(ui,true);assert.equal(ui.read('state.winner'),0);assert.doesNotMatch(ui.html(),/Last Stand active/);
  ui.click('victory');claimFirst(ui);assert.equal(ui.read('run.upgrades["last-stand"]'),1);assert.equal(ui.read('state.lastStand.active'),false);
  assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),1+(ui.read('run.upgrades["quick-draw"]')||0));
  ui.click('start');assert.equal(ui.read('state.lastStand.owned'),false);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),1);
});

test('Last Stand waits for Flexible Carry confirmation and collection marks all upgrades implemented', () => {
  const ui=setup();ui.click('start');vm.runInContext('run.upgrades=Object.fromEntries(U.definitions.map(d=>[d.id,d.maxLevel]));startEncounter()',ui.context);
  ui.read('state.wins[1]=G.rules.winsRequired-2');fixture(ui,false);assert.equal(ui.read('state.lastStand.active'),false);ui.click('flexible-carry');
  assert.equal(ui.read('state.lastStand.active'),false);assert.equal(ui.read('state.sides[0].discardAllowance'),3);
  ui.click(undefined,undefined,undefined,undefined,ui.read('state.sides[0].hand[0]'));ui.click('carry-confirm');
  assert.equal(ui.read('state.lastStand.active'),true);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),5);
  const markup=ui.read('upgradeCollectionMarkup()');assert.equal((markup.match(/Enabled/g)||[]).length,6);assert.equal((markup.match(/Not yet implemented/g)||[]).length,0);
  assert.equal(U.get('last-stand').maxLevel,1);assert.throws(()=>U.collect(ui.read('run.upgrades'),'last-stand'));
});

test('draw pile hides information without ownership and rank-only markup cannot leak a suit', () => {
  const ui=setup();ui.click('start');
  for(const level of [0,1]) {
    const variants=[];
    for(const card of [24,25,26,27]) {
      variants.push(ui.read(`state.peekAheadLevel=${level};state.sides[0].pile=[${card}];playerDrawPile()`));
    }
    assert.ok(variants.every(markup=>markup===variants[0]));
    assert.doesNotMatch(variants[0],/red|peek-suit|hearts|diamonds|clubs|spades|[\u2660\u2665\u2663\u2666]/);
    assert.match(variants[0],level ? /Next draw: A; suit hidden/ : /next card hidden/);
    if(!level)assert.doesNotMatch(variants[0],/peek-rank/);
  }
  const markup=ui.read('state.peekAheadLevel=2;state.sides[0].pile=[25];playerDrawPile()');
  assert.match(markup,/Next draw: A of hearts/);assert.match(markup,/mini-pile red/);assert.match(markup,/peek-suit/);
  assert.match(ui.read('state.sides[0].pile=[];playerDrawPile()'),/Your draw pile is empty/);
  assert.doesNotMatch(ui.read('playerDrawPile()'),/peek-rank|peek-suit/);
});

test('Peek Ahead renders current information during both draw abilities, persists across bosses and resets on new runs', () => {
  const ui=setup();ui.click('start');
  ui.read('run.upgrades={"peek-ahead":2,"lucky-break":2,"flexible-carry":2};startEncounter()');
  function displayed() {
    const label=ui.read('playerDrawPile()');assert.ok(ui.html().includes(label));
    const next=ui.read('state.sides[0].pile[0]');
    assert.ok(label.includes(G.ranks[Math.floor(next/4)]));
    assert.ok(label.includes(G.suits[G.suit(next)]));
  }
  displayed();ui.click(undefined,ui.read('state.sides[0].hand[0]'));ui.click('lucky-break');displayed();
  ui.click(undefined,undefined,undefined,ui.read('state.luckyBreak.pending.candidates[0]'));ui.click('lucky-confirm');displayed();
  fixture(ui,true);ui.click('flexible-carry');displayed();
  ui.click(undefined,undefined,undefined,undefined,ui.read('state.sides[0].hand[0]'));ui.click('carry-confirm');displayed();
  finishEncounter(ui,true);ui.click('victory');claimFirst(ui);displayed();assert.equal(ui.read('state.peekAheadLevel'),2);
  ui.click('start');assert.equal(ui.read('state.peekAheadLevel'),0);assert.match(ui.read('playerDrawPile()'),/next card hidden/);
});

test('illustrated offers use central artwork, accessible effect descriptions and offered levels', () => {
  const ui=setup();ui.click('start');finishEncounter(ui,true);ui.click('victory');
  for(const d of U.definitions){
    for(let current=0;current<d.maxLevel;current++){
      ui.read(`run.offers=['${d.id}'];run.upgrades={'${d.id}':${current}};run.selectedUpgrade=null;renderUpgradeSelection()`);
      assert.ok(ui.html().includes(`src="${d.artwork.src}" width="${d.artwork.width}" height="${d.artwork.height}"`));
      assert.match(ui.html(),new RegExp(`aria-describedby="offer-description-${d.id}"`));
      assert.ok(ui.html().includes(d.levels[current]));
      assert.match(ui.html(),current ? /Improve from Level 1 to 2/ : /New; Level 1 of [12]/);
      assert.ok(ui.html().includes(`id="offer-description-${d.id}" class="visually-hidden"`));
      assert.doesNotMatch(ui.html(),/class="upgrade-meta"|upgrade-offer-detail|class="eyebrow"|All six upgrades are enabled/);
      if(d.unique)assert.match(ui.html(),/Unique/);
      ui.click('select-upgrade',undefined,d.id);assert.match(ui.html(),/upgrade-choice chosen/);
      assert.match(ui.html(),/aria-pressed="true"/);assert.equal(ui.read('run.upgrades')[d.id],current);
    }
  }
});

test('failed upgrade images expose readable fallback, preserve selection and stay usable after rerender', () => {
  const ui=setup();ui.click('start');finishEncounter(ui,true);ui.click('victory');
  const id=ui.read('run.offers[0]'),d=U.get(id),fallback={hidden:true};
  const image={hidden:false,dataset:{upgradeArt:id},nextElementSibling:fallback,matches:selector=>selector==='.upgrade-portrait'};
  const before=ui.read('JSON.stringify({run,state,bossIndex,endless})');
  ui.elements.get('app').handlers.error({target:image});
  assert.equal(image.hidden,true);assert.equal(fallback.hidden,false);
  assert.equal(ui.read('JSON.stringify({run,state,bossIndex,endless})'),before);
  ui.click('select-upgrade',undefined,id);
  assert.ok(ui.html().includes(`alt="" decoding="async" hidden`));
  assert.ok(ui.html().includes(`<span class="upgrade-fallback" aria-hidden="true" ><span class="upgrade-name">${d.name}</span>`));
  assert.ok(ui.html().includes(d.levels[0]));ui.click('claim-upgrade');
  assert.equal(ui.read('bossIndex'),1);assert.equal(ui.read('run.upgrades')[id],1);
});
