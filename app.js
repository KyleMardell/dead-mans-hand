'use strict';
const G = DMH;
const app = document.getElementById('app');
let state, bossIndex = 0, bossPlay, selected = [], replacing = false, notice = '', log = [], endless = false;
const boss = () => G.bosses[Math.min(bossIndex, 4)];
function cardMarkup(c, interactive = false) {
  const red = G.suit(c) === 1 || G.suit(c) === 3;
  const inside = `<span>${G.ranks[Math.floor(c / 4)]}</span><span class="pip" aria-hidden="true">${G.suits[G.suit(c)]}</span><span class="corner" aria-hidden="true">${G.suits[G.suit(c)]}</span>`;
  const suitName = ['spades', 'hearts', 'clubs', 'diamonds'][G.suit(c)];
  return interactive ? `<button class="card ${red ? 'red' : ''} ${selected.includes(c) ? 'selected' : ''}" data-card="${c}" aria-label="${G.ranks[Math.floor(c / 4)]} of ${suitName}" aria-pressed="${selected.includes(c)}">${inside}</button>` : `<div class="card static ${red ? 'red' : ''}" role="img" aria-label="${G.ranks[Math.floor(c / 4)]} of ${suitName}">${inside}</div>`;
}
const backs = () => '<div class="card back" aria-label="Hidden card">♠</div>'.repeat(5);
function intro() {
  app.innerHTML = `<section class="intro"><p class="eyebrow">A small deck. A long road.</p><h1>Dead Man’s<br>Hand<span style="color:var(--gold)">.</span></h1><p class="lead">Five bosses stand between you and daylight. Play three. Keep two. Make them count.</p><div class="hero-cards" aria-hidden="true">${[12, 16, 20].map(c => cardMarkup(c)).join('')}</div><button class="primary" data-action="start">Take a seat <span aria-hidden="true">↗</span></button><p class="fine">First to two wins · One defeat ends your run</p></section>`;
}
function startEncounter() {
  state = G.newEncounter(); selected = []; replacing = false; log = []; notice = '';
  // Commit boss decisions before the player's selection or replacement.
  bossPlay = G.aiTurn(state, 1, boss(), Math.random); render();
}
function pathMarkup() { return `<ol class="boss-path" aria-label="Run progress">${G.bosses.map((b, i) => `<li class="${i < bossIndex ? 'done' : i === bossIndex ? 'active' : ''}" ${i === bossIndex ? 'aria-current="step"' : ''}>${i < bossIndex ? '✓' : String(i + 1).padStart(2, '0')}<br>${b.name.replace('The ', '')}</li>`).join('')}</ol>`; }
function render() {
  const reveal = state.phase === 'reveal', ended = state.winner !== null;
  const mine = state.sides[0], theirs = state.sides[1];
  let title = replacing ? 'Choose one card to replace' : 'Choose your three';
  let sub = replacing ? 'Its replacement is yours to keep or play.' : 'The other two stay with you for the next hand.';
  if (reveal) {
    title = state.last.result > 0 ? 'You take the hand.' : state.last.result < 0 ? 'The boss takes the hand.' : 'A dead heat.';
    sub = state.last.result === 0 ? 'No point awarded. Play another hand.' : `${G.evaluate(state.last.plays[0]).name} against ${G.evaluate(state.last.plays[1]).name}.`;
    if (ended) sub = state.winner === 0 ? 'Two wins. The road is yours to continue.' : 'Two wins for the boss. Your run ends here.';
  }
  app.innerHTML = `${endless ? `<p class="eyebrow">ENDLESS · ENCOUNTER ${bossIndex + 1}</p>` : pathMarkup()}<section aria-label="Card table"><div class="boss-heading"><div><p class="eyebrow">${endless ? 'Beyond the first five' : `Boss ${bossIndex + 1} of 5`}</p><h2>${boss().name}</h2><div class="boss-sub">${boss().title}</div></div><div class="boss-mark" aria-hidden="true">${['♧','♢','♤','♔','♠'][Math.min(bossIndex,4)]}</div></div><div class="scoreboard" aria-label="You ${state.wins[0]}, boss ${state.wins[1]}"><div class="score-side">You <b>${state.wins[0]}</b></div><div class="middle">HAND ${state.handNumber}<br>FIRST TO TWO</div><div class="score-side"><b>${state.wins[1]}</b> Boss</div></div><div class="opponent"><div class="cards">${reveal ? state.last.plays[1].map(c=>cardMarkup(c)).join('') : backs()}</div><p class="opponent-label">${reveal ? `BOSS · ${G.evaluate(state.last.plays[1]).name.toUpperCase()}` : 'THE BOSS HAS CHOSEN'}</p></div><div class="table-status" role="status" aria-live="polite"><h3>${title}</h3><p>${sub}</p></div>${reveal ? `<div class="cards reveal-cards">${state.last.plays[0].map(c=>cardMarkup(c)).join('')}</div><p class="opponent-label" style="text-align:center">YOU · ${G.evaluate(state.last.plays[0]).name.toUpperCase()}</p><div class="actions"><button class="primary" data-action="${ended ? state.winner === 0 ? 'victory' : 'loss' : 'next'}">${ended ? state.winner === 0 ? bossIndex === 4 && !endless ? 'Finish the run →' : 'Next boss →' : 'See your run →' : 'Next hand →'}</button></div>` : `<div class="rack"><div class="rack-header"><h3>Your five cards</h3><span>${mine.discarded ? 'Replacement used' : '1 optional replacement'}</span></div><div class="cards">${mine.hand.map(c=>cardMarkup(c,true)).join('')}</div><div class="selection-info" role="status" aria-live="polite">${selected.length === 3 ? G.evaluate(selected).name + ' · Ready to play' : replacing ? 'Tap a card to replace it' : `${selected.length} of 3 selected`}</div><div class="actions"><button class="secondary" data-action="replace" ${mine.discarded || !mine.pile.length ? 'disabled' : ''}>${replacing ? 'Cancel replace' : 'Replace one'}</button><button class="primary" data-action="play" ${selected.length !== 3 || replacing ? 'disabled' : ''}>Play three →</button></div></div>`}<p class="notice" role="status">${notice}</p><div class="deck-info"><span>Your deck: ${mine.pile.length} · Out: ${mine.out.length}</span><span>Boss deck: ${theirs.pile.length} · Out: ${theirs.out.length}</span></div>${log.length ? `<details class="history"><summary>Table history · ${log.length} ${log.length===1?'hand':'hands'}</summary>${log.map(l=>`<p>${l}</p>`).join('')}</details>` : ''}</section>`;
}
function ending(won) {
  app.innerHTML = `<section class="ending"><p class="eyebrow">${won ? 'THE FIRST FIVE · COMPLETE' : 'THE ROAD ENDS HERE'}</p><div class="symbol" aria-hidden="true">${won ? '♔' : '♠'}</div><h1>${won ? 'You saw daylight.' : 'The house remembers.'}</h1><p>${won ? 'Five bosses beaten. Walk away a winner, or keep playing against the Undertaker in endless mode.' : `${bossIndex} ${bossIndex===1?'boss':'bosses'} defeated. ${boss().name} took this encounter ${state.wins[1]}–${state.wins[0]}. A new run means a fresh start.`}</p><div class="actions">${won ? '<button class="secondary" data-action="endless">Play endless</button>' : ''}<button class="primary" data-action="start">${won ? 'New run' : 'Try again'}</button></div></section>`;
}
app.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target || target.disabled) return;
  if (target.dataset.card !== undefined) {
    const card = Number(target.dataset.card);
    if (state.phase !== 'choose') return;
    if (replacing) { G.discard(state, 0, card); selected = []; replacing = false; notice = `${G.label(card)} is out. Your replacement has arrived.`; }
    else if (selected.includes(card)) selected = selected.filter(c => c !== card);
    else if (selected.length < 3) { selected.push(card); notice = ''; }
    else notice = 'Unselect a card to change your three.';
    render(); const focused = app.querySelector(`[data-card="${card}"]`); if(focused) focused.focus({preventScroll:true}); return;
  }
  switch (target.dataset.action) {
    case 'start': bossIndex = 0; endless = false; startEncounter(); break;
    case 'replace': replacing = !replacing; selected = []; notice = ''; render(); break;
    case 'play': {
      if (selected.length !== 3 || state.phase !== 'choose') return;
      const result = G.reveal(state, [[...selected], bossPlay]);
      log.unshift(`Hand ${state.handNumber}: you ${result.plays[0].map(G.label).join(' ')} · boss ${result.plays[1].map(G.label).join(' ')} · ${result.result > 0 ? 'you win' : result.result < 0 ? 'boss wins' : 'tie'}`);
      notice = ''; render(); break;
    }
    case 'next': {
      const refreshed = G.nextHand(state); selected = []; replacing = false;
      bossPlay = G.aiTurn(state, 1, boss(), Math.random);
      notice = refreshed ? 'Decks exhausted: both sides received fresh decks and five new cards. Score kept.' : '';
      render(); break;
    }
    case 'victory': if (bossIndex === 4 && !endless) ending(true); else { bossIndex++; startEncounter(); } break;
    case 'loss': ending(false); break;
    case 'endless': endless = true; bossIndex++; startEncounter(); break;
  }
});
document.getElementById('rules-toggle').addEventListener('click', event => {
  const rules = document.getElementById('rules'); rules.hidden = !rules.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!rules.hidden));
  if (!rules.hidden) rules.scrollIntoView({behavior: 'instant', block: 'start'});
});
intro();
