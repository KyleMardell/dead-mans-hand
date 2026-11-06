'use strict';
const G = DMH;
const app = document.getElementById('app');
let state, bossIndex = 0, bossPlay, selected = [], discardWarning = false, notice = '', log = [], endless = false;
const boss = () => G.bosses[Math.min(bossIndex, 4)];
function cardMarkup(c, interactive = false) {
  const red = G.suit(c) === 1 || G.suit(c) === 3;
  const inside = `<span>${G.ranks[Math.floor(c / 4)]}</span><span class="pip" aria-hidden="true">${G.suits[G.suit(c)]}</span><span class="corner" aria-hidden="true">${G.suits[G.suit(c)]}</span>`;
  const suitName = ['spades', 'hearts', 'clubs', 'diamonds'][G.suit(c)];
  return interactive ? `<button class="card ${red ? 'red' : ''} ${selected.includes(c) ? 'selected' + (discardWarning ? ' discard-warning' : '') : ''}" data-card="${c}" aria-label="${G.ranks[Math.floor(c / 4)]} of ${suitName}" aria-pressed="${selected.includes(c)}">${inside}</button>` : `<div class="card static ${red ? 'red' : ''}" role="img" aria-label="${G.ranks[Math.floor(c / 4)]} of ${suitName}">${inside}</div>`;
}
const backs = () => '<div class="card back" aria-label="Hidden card">♠</div>'.repeat(5);
function intro() {
  app.className = '';
  document.body.classList.remove('playing');
  app.innerHTML = `<section class="intro"><p class="eyebrow">A small deck. A long road.</p><h1>Dead Man’s<br>Hand<span style="color:var(--gold)">.</span></h1><p class="lead">Five bosses stand between you and daylight. Play three. Keep two. Make them count.</p><div class="hero-cards" aria-hidden="true">${[12, 16, 20].map(c => cardMarkup(c)).join('')}</div><button class="primary" data-action="start">Take a seat <span aria-hidden="true">↗</span></button><p class="fine">First to two wins · One defeat ends your run</p></section>`;
}
function startEncounter() {
  state = G.newEncounter(); selected = []; discardWarning = false; log = []; notice = '';
  // Commit boss decisions before the player's selection or replacement.
  bossPlay = G.aiTurn(state, 1, boss(), Math.random); render();
}
function pathMarkup() {
  return endless ? `<span class="encounter-progress endless-progress">ENDLESS &middot; ENCOUNTER ${bossIndex + 1}</span>` : `<div class="encounter-progress" role="img" aria-label="Boss ${bossIndex + 1} of 5"><span>${String(bossIndex + 1).padStart(2, '0')} <span class="progress-total">/ 05</span></span><span class="progress-track" aria-hidden="true"><span style="width:${(bossIndex + 1) * 20}%"></span></span></div>`;
}
function render() {
  app.className = 'gameplay';
  document.body.classList.add('playing');
  const reveal = state.phase === 'reveal', ended = state.winner !== null;
  const mine = state.sides[0], theirs = state.sides[1];
  const available = Math.min(G.remainingDiscards(mine), mine.pile.length);
  let title = 'Choose three';
  let sub = 'Play three. Keep two for the next hand.';
  if (reveal) {
    title = state.last.result > 0 ? 'You take the hand.' : state.last.result < 0 ? 'The boss takes the hand.' : 'A dead heat.';
    sub = state.last.result === 0 ? 'No point awarded. Play another hand.' : `${G.evaluate(state.last.plays[0]).name} against ${G.evaluate(state.last.plays[1]).name}.`;
    if (ended) sub = state.winner === 0 ? 'Two wins. The road is yours to continue.' : 'Two wins for the boss. Your run ends here.';
  }
  app.innerHTML = `<section aria-label="Card table">
    <header class="encounter-header">
      ${pathMarkup()}
      <h2>${boss().name}</h2><p class="boss-sub">${boss().title}</p>
    </header>
    <div class="scoreboard" role="group" aria-label="Score: you ${state.wins[0]}, boss ${state.wins[1]}. Hand ${state.handNumber}. First to two wins.">
      <span class="score-side">You <b>${state.wins[0]}</b></span><span class="score-hand">Hand ${state.handNumber}</span><span class="score-side"><b>${state.wins[1]}</b> Boss</span>
    </div>
    <div class="opponent" aria-label="Boss cards"><div class="cards">${reveal ? state.last.plays[1].map(c=>cardMarkup(c)).join('') : backs()}</div>${reveal ? `<p class="opponent-label">${G.evaluate(state.last.plays[1]).name}</p>` : ''}</div>
    <div class="table-status" role="status" aria-live="polite"><h3>${title}</h3><p>${sub}</p></div>
    ${reveal ? `<div class="cards reveal-cards" aria-label="Your played cards">${state.last.plays[0].map(c=>cardMarkup(c)).join('')}</div><p class="opponent-label player-result">${G.evaluate(state.last.plays[0]).name}</p><div class="actions"><button class="primary" data-action="${ended ? state.winner === 0 ? 'victory' : 'loss' : 'next'}">${ended ? state.winner === 0 ? bossIndex === 4 && !endless ? 'Finish the run &rarr;' : 'Next boss &rarr;' : 'See your run &rarr;' : 'Next hand &rarr;'}</button></div>` : `<div class="rack" role="group" aria-label="Your five cards">
      <div class="cards">${mine.hand.map(c=>cardMarkup(c,true)).join('')}</div>
      <div class="selection-info" role="status" aria-live="polite">${selected.length === 3 ? G.evaluate(selected).name + ' &middot; Ready to play' : selected.length ? `${selected.length} selected &middot; Choose 3 to play` : available ? 'Select cards to discard, or three to play.' : 'Select three cards to play.'}</div>
      <div class="actions"><button class="secondary" data-action="replace" ${!available ? 'disabled' : ''}>Discard <span class="discard-count">(${available} left)</span></button><button class="primary" data-action="play" ${selected.length !== 3 ? 'disabled' : ''}>Play Three &rarr;</button></div>
    </div>`}
    <p class="notice ${discardWarning ? 'discard-error' : ''}" role="status">${notice}</p>
    <div class="deck-info"><span>Your deck: ${mine.pile.length} &middot; Out: ${mine.out.length}</span><span>Boss deck: ${theirs.pile.length} &middot; Out: ${theirs.out.length}</span></div>
    ${log.length ? `<details class="history"><summary>Table history &middot; ${log.length} ${log.length===1?'hand':'hands'}</summary>${log.map(l=>`<p>${l}</p>`).join('')}</details>` : ''}
  </section>`;
}
function ending(won) {
  app.className = '';
  document.body.classList.remove('playing');
  app.innerHTML = `<section class="ending"><p class="eyebrow">${won ? 'THE FIRST FIVE · COMPLETE' : 'THE ROAD ENDS HERE'}</p><div class="symbol" aria-hidden="true">${won ? '♔' : '♠'}</div><h1>${won ? 'You saw daylight.' : 'The house remembers.'}</h1><p>${won ? 'Five bosses beaten. Walk away a winner, or keep playing against the Undertaker in endless mode.' : `${bossIndex} ${bossIndex===1?'boss':'bosses'} defeated. ${boss().name} took this encounter ${state.wins[1]}–${state.wins[0]}. A new run means a fresh start.`}</p><div class="actions">${won ? '<button class="secondary" data-action="endless">Play endless</button>' : ''}<button class="primary" data-action="start">${won ? 'New run' : 'Try again'}</button></div></section>`;
}
app.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target || target.disabled) return;
  if (target.dataset.card !== undefined) {
    const card = Number(target.dataset.card);
    if (state.phase !== 'choose') return;
    discardWarning = false; notice = '';
    if (selected.includes(card)) selected = selected.filter(c => c !== card);
    else selected.push(card);
    render(); const focused = app.querySelector(`[data-card="${card}"]`); if(focused) focused.focus({preventScroll:true}); return;
  }
  switch (target.dataset.action) {
    case 'start': bossIndex = 0; endless = false; startEncounter(); break;
    case 'replace': {
      if (state.phase !== 'choose') return;
      const available = Math.min(G.remainingDiscards(state.sides[0]), state.sides[0].pile.length);
      discardWarning = false;
      if (!selected.length) notice = 'Select a card to discard first.';
      else if (selected.length > available) {
        discardWarning = true;
        notice = `You can only discard ${available} ${available === 1 ? 'card' : 'cards'}.`;
      } else {
        const count = selected.length;
        G.discard(state, 0, [...selected]);
        selected = [];
        notice = `${count} ${count === 1 ? 'card discarded' : 'cards discarded'}. Choose three to play.`;
      }
      render();
      const button = app.querySelector('[data-action="replace"]:not(:disabled)') || app.querySelector('[data-card]');
      if (button) button.focus({preventScroll:true});
      break;
    }
    case 'play': {
      if (selected.length !== 3 || state.phase !== 'choose') return;
      const result = G.reveal(state, [[...selected], bossPlay]);
      log.unshift(`Hand ${state.handNumber}: you ${result.plays[0].map(G.label).join(' ')} · boss ${result.plays[1].map(G.label).join(' ')} · ${result.result > 0 ? 'you win' : result.result < 0 ? 'boss wins' : 'tie'}`);
      notice = ''; discardWarning = false; render(); break;
    }
    case 'next': {
      const refreshed = G.nextHand(state); selected = []; discardWarning = false;
      bossPlay = G.aiTurn(state, 1, boss(), Math.random);
      notice = refreshed ? 'Decks exhausted: both sides received fresh decks and five new cards. Score kept.' : '';
      render(); break;
    }
    case 'victory': if (bossIndex === 4 && !endless) ending(true); else { bossIndex++; startEncounter(); } break;
    case 'loss': ending(false); break;
    case 'endless': endless = true; bossIndex++; startEncounter(); break;
  }
});
const rules = document.getElementById('rules');
const rulesToggle = document.getElementById('rules-toggle');
rulesToggle.addEventListener('click', () => {
  if (rules.open) return;
  rules.showModal();
  rulesToggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('rules-open');
  document.getElementById('rules-close').focus({ preventScroll: true });
});
document.getElementById('rules-close').addEventListener('click', () => rules.close());
// Keep keyboard navigation inside the modal, including at either tab boundary.
rules.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    rules.close();
  } else if (event.key === 'Tab') {
    const stops = rules.querySelectorAll('button, [tabindex="0"]');
    const first = stops[0], last = stops[stops.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
});
// Native dialog makes background content inert; both close paths restore focus.
rules.addEventListener('close', () => {
  rulesToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('rules-open');
  rulesToggle.focus({ preventScroll: true });
});
intro();
