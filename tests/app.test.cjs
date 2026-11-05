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
  for (const id of ['app','rules','rules-toggle']) elements.set(id,{ innerHTML:'', hidden:true, handlers:{}, addEventListener(type,fn){this.handlers[type]=fn;}, querySelector(){return null;}, setAttribute(){}, scrollIntoView(){} });
  const context = vm.createContext({ DMH:G, document:{getElementById:id=>elements.get(id)}, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  const click = (action, card) => elements.get('app').handlers.click({target:{closest:()=>({disabled:false,dataset: card === undefined ? {action} : {card:String(card)}})}});
  const read = expression => vm.runInContext(expression, context);
  return { context, click, read, html:()=>elements.get('app').innerHTML };
}
function fixture(ui, win) {
  vm.runInContext(`{
    const good = [20,21,22,0,1], bad = [0,5,10,11,12];
    const hands = ${win ? '[good,bad]' : '[bad,good]'};
    state.sides = hands.map(hand=>({hand:[...hand],pile:G.deck().filter(c=>!hand.includes(c)),out:[],discarded:false}));
    bossPlay = state.sides[1].hand.slice(0,3); selected = []; replacing = false; render();
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
  assert.match(ui.html(),/ENDLESS · ENCOUNTER 6/); assert.match(ui.html(),/The Undertaker/);
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
test('replacement clears selection and cannot be used twice; play requires exactly three', () => {
  const ui=setup();ui.click('start');const card=ui.read('state.sides[0].hand[0]');
  ui.click(undefined,card);ui.click('play');assert.equal(ui.read('state.phase'),'choose');
  ui.click('replace');ui.click(undefined,card);
  assert.equal(ui.read('selected.length'),0);assert.equal(ui.read('state.sides[0].discarded'),true);
  assert.match(ui.html(),/Replacement used/); assert.match(ui.html(),/data-action="replace" disabled/);
});
