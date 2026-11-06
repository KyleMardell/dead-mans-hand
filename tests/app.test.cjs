const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../engine.js');
// Exercise real UI event handlers without a browser dependency. Engine fixtures
// control outcomes so every run transition can be reached deterministically.
function setup() {
  const elements = new Map();
  const document = { getElementById:id=>elements.get(id), body:{classList:{add(){},remove(){}}}, activeElement:null };
  for (const id of ['app','rules','rules-toggle','rules-close']) elements.set(id,{ innerHTML:'', open:false, attributes:{}, handlers:{}, addEventListener(type,fn){this.handlers[type]=fn;}, querySelector(){return null;}, setAttribute(key,value){this.attributes[key]=value;}, focus(){document.activeElement=this;}, showModal(){this.open=true;}, close(){this.open=false;this.handlers.close();} });
  const context = vm.createContext({ DMH:G, document, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  const click = (action, card) => elements.get('app').handlers.click({target:{closest:()=>({disabled:false,dataset: card === undefined ? {action} : {card:String(card)}})}});
  const read = expression => vm.runInContext(expression, context);
  return { context, click, read, elements, document, html:()=>elements.get('app').innerHTML };
}
function fixture(ui, win) {
  vm.runInContext(`{
    const good = [20,21,22,0,1], bad = [0,5,10,11,12];
    const hands = ${win ? '[good,bad]' : '[bad,good]'};
    state.sides = hands.map(hand=>({hand:[...hand],pile:G.deck().filter(c=>!hand.includes(c)),out:[],discarded:false}));
    bossPlay = state.sides[1].hand.slice(0,3); selected = []; discardWarning = false; render();
  }`,ui.context);
  const cards = ui.read('state.sides[0].hand.slice(0,3)');
  cards.forEach(c=>ui.click(undefined,c)); ui.click('play');
}
test('five encounters advance only on victory, finish screen offers optional endless, new run resets', () => {
  const ui = setup(); ui.click('start');
  for(let b=0;b<5;b++) {
    assert.equal(ui.read('bossIndex'),b); assert.deepEqual([...ui.read('state.wins')],[0,0]);
    fixture(ui,true); assert.equal(ui.read('state.winner'),null); ui.click('next');
    fixture(ui,true); assert.equal(ui.read('state.winner'),0); ui.click('victory');
  }
  assert.match(ui.html(),/You saw daylight/); assert.match(ui.html(),/Play endless/);
  ui.click('endless'); assert.equal(ui.read('bossIndex'),5); assert.equal(ui.read('endless'),true);
  assert.match(ui.html(),/ENDLESS &middot; ENCOUNTER 6/); assert.match(ui.html(),/The Undertaker/);
  fixture(ui,true); ui.click('next'); fixture(ui,true); ui.click('victory');
  assert.equal(ui.read('bossIndex'),6);
  ui.click('start'); assert.equal(ui.read('bossIndex'),0); assert.equal(ui.read('endless'),false);
});
test('one encounter defeat ends run and retry starts from boss one', () => {
  const ui = setup(); ui.click('start'); fixture(ui,false); ui.click('next'); fixture(ui,false);
  assert.equal(ui.read('state.winner'),1); assert.match(ui.html(),/Your run ends here/);
  ui.click('loss'); assert.match(ui.html(),/The house remembers/); assert.match(ui.html(),/0 bosses defeated/);
  ui.click('start'); assert.deepEqual([...ui.read('state.wins')],[0,0]); assert.equal(ui.read('bossIndex'),0);
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
  assert.match(ui.html(),/data-action="replace" disabled/);assert.match(ui.html(),/\(0 left\)/);
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
    assert.match(ui.html(),/\(2 left\)/);
    const cards=[...ui.read('state.sides[0].hand.slice(0,2)')];
    if(batch){cards.forEach(c=>ui.click(undefined,c));ui.click('replace');}
    else {for(const card of cards){ui.click(undefined,card);ui.click('replace');}}
    assert.equal(ui.read('state.sides[0].out.length'),2);assert.equal(ui.read('selected.length'),0);
    assert.equal(ui.read('state.sides[0].pile.length'),17);assert.equal(ui.read('G.remainingDiscards(state.sides[0])'),0);
    assert.match(ui.html(),/data-action="replace" disabled/);
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

test('centred header uses current/total progress and an uncapped hand indicator', () => {
  const ui=setup();ui.click('start');
  assert.match(ui.read('pathMarkup()'),/01 <span class="progress-total">\/ 05/);
  assert.equal((ui.html().match(/The Drifter/g)||[]).length,1);
  assert.match(ui.html(),/class="score-hand">Hand 1</);
  vm.runInContext('state.handNumber=4;render()',ui.context);
  assert.match(ui.html(),/class="score-hand">Hand 4</);
  assert.doesNotMatch(ui.html(),/Hand 4\/3|boss-path/);
  fixture(ui,true);assert.match(ui.html(),/You <b>1<\/b>/);ui.click('next');
  assert.match(ui.html(),/class="score-hand">Hand 5</);
  fixture(ui,true);ui.click('victory');
  assert.match(ui.read('pathMarkup()'),/02 <span class="progress-total">\/ 05/);
});
