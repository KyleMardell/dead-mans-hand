'use strict';
const G = DMH;
const U = DMHUpgrades;
const newRun = () => ({ upgrades: {}, phase: 'intro', offers: [], selectedUpgrade: null });
let run = newRun();
const app = document.getElementById('app');
let state, bossIndex = 0, bossPlay, selected = [], discardWarning = false, notice = '', log = [], endless = false, luckyCandidate = null, carryCandidate = null;
const boss = () => G.bosses[Math.min(bossIndex, 4)];
function cardMarkup(c, interactive = false, selection = selected, dataKey = 'card') {
  const red = G.suit(c) === 1 || G.suit(c) === 3;
  const inside = `<span>${G.ranks[Math.floor(c / 4)]}</span><span class="pip" aria-hidden="true">${G.suits[G.suit(c)]}</span><span class="corner" aria-hidden="true">${G.suits[G.suit(c)]}</span>`;
  const suitName = ['spades', 'hearts', 'clubs', 'diamonds'][G.suit(c)];
  return interactive ? `<button class="card ${red ? 'red' : ''} ${selection.includes(c) ? 'selected' + (discardWarning ? ' discard-warning' : '') : ''}" data-${dataKey}="${c}" aria-label="${G.ranks[Math.floor(c / 4)]} of ${suitName}" aria-pressed="${selection.includes(c)}">${inside}</button>` : `<div class="card static ${red ? 'red' : ''}" role="img" aria-label="${G.ranks[Math.floor(c / 4)]} of ${suitName}">${inside}</div>`;
}
function backs() {
  const reveals = state.readTheTable.reveals;
  return Array.from({length:5}, (_, position) => {
    const info = reveals.find(r => r.position === position);
    return `<div class="card back${info ? ' rank-known' : ''}" role="img" aria-label="${info ? `Rank ${info.rank}; suit hidden` : 'Hidden card'}">${info ? `<span class="known-rank">${info.rank}</span>` : '<span aria-hidden="true">♠</span>'}</div>`;
  }).join('');
}
function commitBossDecision() {
  bossPlay = G.commitBossPlay(state, G.aiTurn(state, 1, boss(), Math.random));
}
function intro() {
  app.className = '';
  document.body.classList.remove('playing');
  app.innerHTML = `<section class="intro"><p class="eyebrow">Play three. Keep two. Make them count.</p><h1>Dead Man’s<br>Hand</h1><p class="lead">Five bosses stand between you and daylight.</p><div class="hero-cards" aria-hidden="true">${[12, 16, 20].map(c => cardMarkup(c)).join('')}</div><button class="primary" data-action="start">Take a seat <span aria-hidden="true">↗</span></button></section>`;
}
function startEncounter() {
  run.phase = 'table';
  document.getElementById('upgrades-toggle').hidden = false;
  state = G.newEncounter(Math.random, run.upgrades); luckyCandidate = null; carryCandidate = null; selected = []; discardWarning = false; log = []; notice = '';
  // Commit boss decisions before the player's selection or replacement.
  commitBossDecision(); render();
}
function pathMarkup() {
  return endless ? `<span class="encounter-progress endless-progress">ENDLESS &middot; ENCOUNTER ${bossIndex + 1}</span>` : `<div class="encounter-progress" role="img" aria-label="Boss ${bossIndex + 1} of 5"><span>${String(bossIndex + 1).padStart(2, '0')} <span class="progress-total">/ 05</span></span><span class="progress-track" aria-hidden="true"><span style="width:${(bossIndex + 1) * 20}%"></span></span></div>`;
}
function bossArtwork() {
  // Derive the PNG asset name from the existing boss identity.
  const filename = boss().name.replace(/^The /, '').toLowerCase();
  return `<div class="boss-artwork"><img class="boss-portrait" src="assets/images/bosses/${filename}.png" width="1060" height="1484" alt="${boss().name}, Western wanted poster" loading="eager" decoding="async"><h2 class="boss-fallback" hidden>${boss().name}</h2></div>`;
}
function scoreChips(sideIndex) {
  const spent = state.wins[1 - sideIndex];
  const label = sideIndex === 0 ? 'You' : 'Boss';
  return `<div class="chip-score ${sideIndex === 0 ? 'player-chips' : 'boss-chips'}" role="img" aria-label="${label}: ${2 - spent} of 2 chips remaining; ${state.wins[sideIndex]} hands won"><span class="chip-label" aria-hidden="true">${label}</span><span class="chip-pair" aria-hidden="true">${[0, 1].map(i => `<span class="poker-chip${i < spent ? ' spent' : ''}"></span>`).join('')}</span></div>`;
}
function playerDrawPile() {
  const info = G.peekAhead(state);
  if (info.empty) return '<span class="draw-pile" role="img" aria-label="Your draw pile is empty"><span class="empty-pile" aria-hidden="true">&mdash;</span></span>';
  let label = 'Your draw pile; next card hidden', classes = 'card back mini-pile', inside = '';
  if (info.rank) {
    label = `Next draw: ${info.rank}; suit hidden`;
    inside = `<span class="peek-rank">${info.rank}</span>`;
  }
  if (info.suit) {
    const suitName = ['spades','hearts','clubs','diamonds'][G.suits.indexOf(info.suit)];
    label = `Next draw: ${info.rank} of ${suitName}`;
    classes = `card mini-pile${info.suit === '♥' || info.suit === '♦' ? ' red' : ''}`;
    inside += `<span class="peek-suit">${info.suit}</span>`;
  }
  return `<span class="draw-pile" role="img" aria-label="${label}"><span class="${classes}" aria-hidden="true">${inside}</span></span>`;
}
function playerDeckCaption() {
  const side = state.sides[0];
  return `<div class="player-deck">${playerDrawPile()}<span>Your deck: ${side.pile.length} &middot; Out: ${side.out.length}</span></div>`;
}
function render() {
  if (state.phase === 'flexible-carry') { renderFlexibleCarryChoice(); return; }
  if (state.phase === 'lucky-break') { renderLuckyBreakChoice(); return; }
  app.className = 'gameplay';
  document.body.classList.add('playing');
  const reveal = state.phase === 'reveal', ended = state.winner !== null;
  const mine = state.sides[0], theirs = state.sides[1];
  const remaining = G.remainingDiscards(mine);
  const available = Math.min(remaining, mine.pile.length);
  const deckCaption = playerDeckCaption();
  const playerDeck = !reveal && state.luckyBreak.limit ? `<div class="player-tools"><button class="quiet lucky-action" data-action="lucky-break" aria-label="Lucky Break; ${state.luckyBreak.remaining} uses remaining this boss" ${selected.length !== 1 || !remaining || mine.pile.length < 2 || !state.luckyBreak.remaining ? 'disabled' : ''}>Lucky Break <span>${state.luckyBreak.remaining} left</span></button>${deckCaption}</div>` : deckCaption;
  let title = '', sub = '', resultTone = '';
  if (reveal) {
    resultTone = state.last.result > 0 ? 'win' : state.last.result < 0 ? 'loss' : 'tie';
    title = state.last.result > 0 ? 'You take the hand.' : state.last.result < 0 ? 'The boss takes the hand.' : 'A dead heat.';
    sub = state.last.result === 0 ? 'No point awarded. Play another hand.' : `${G.evaluate(state.last.plays[0]).name} against ${G.evaluate(state.last.plays[1]).name}.`;
    if (ended) {
      title = state.winner === 0 ? 'Boss defeated' : 'Run over';
      sub = state.winner === 0 ? boss().name : `Defeated by ${boss().name}`;
    }
  }
  app.innerHTML = `<section aria-label="Card table">
    <header class="encounter-header">
      <div class="boss-identity">${bossArtwork()}<p class="boss-deck">Boss deck: ${theirs.pile.length} &middot; Out: ${theirs.out.length}</p></div>
      <div class="encounter-info">
        ${pathMarkup()}
        <p class="boss-sub">${boss().title}</p>
        <span class="score-hand">Hand ${state.handNumber}</span>
        ${state.lastStand.active ? '<p class="last-stand-note" role="status">Last Stand active &middot; +2 discards</p>' : ''}
      </div>
    </header>
    <div class="opponent" aria-label="Boss cards"><div class="cards">${reveal ? state.last.plays[1].map(c=>cardMarkup(c)).join('') : backs()}</div>${reveal ? `<p class="opponent-label">${G.evaluate(state.last.plays[1]).name}</p>` : state.readTheTable.reveals.length ? `<span class="visually-hidden" role="status">Revealed boss ranks: ${state.readTheTable.reveals.map(r => r.rank).join(', ')}. Suits hidden.</span>` : ''}</div>
    <div class="table-centre${ended ? ' encounter-ended' : ''}" role="group" aria-label="Encounter chips; first to two hand wins">
      ${scoreChips(0)}
      ${reveal ? `<div class="table-status result-${resultTone}${ended ? ' encounter-result' : ''}" role="status" aria-live="polite" aria-atomic="true"><h3>${title}</h3><p>${sub}</p></div>` : state.readTheTable.level ? `<button class="quiet read-action" data-action="read-table" aria-label="Read the Table; ${state.readTheTable.remaining} use remaining this boss" ${!state.readTheTable.remaining || !state.bossCommitment ? 'disabled' : ''}>Read the Table <span>${state.readTheTable.remaining} left</span></button>` : '<span></span>'}
      ${scoreChips(1)}
    </div>
    ${reveal ? `<div class="cards reveal-cards" aria-label="Your played cards">${state.last.plays[0].map(c=>cardMarkup(c)).join('')}</div><p class="opponent-label player-result">${G.evaluate(state.last.plays[0]).name}</p>${playerDeck}<div class="actions">${!ended && G.canFlexibleCarry(state) ? `<button class="secondary carry-action" data-action="flexible-carry">Flexible Carry <span>${state.flexibleCarry.remaining} left</span></button>` : ''}<button class="primary" data-action="${ended ? state.winner === 0 ? 'victory' : 'loss' : 'next'}">${ended ? state.winner === 0 ? U.eligible(run.upgrades).length ? 'Choose upgrade &rarr;' : bossIndex === 4 && !endless ? 'Finish the run &rarr;' : 'Next boss &rarr;' : 'Run summary &rarr;' : 'Next hand &rarr;'}</button></div>` : `<div class="rack" role="group" aria-label="Your five cards">
      <div class="cards">${mine.hand.map(c=>cardMarkup(c,true)).join('')}</div>
      ${playerDeck}
      <div class="actions"><button class="${selected.length > 0 && selected.length <= available ? 'primary' : 'secondary'}" data-action="replace" aria-label="Discard; ${remaining} remaining" title="${!remaining ? 'No discards remaining this hand.' : !mine.pile.length ? 'Your draw pile is empty.' : 'Discard selected cards.'}" ${!available ? 'disabled' : ''}>Discard <span class="discard-count" aria-hidden="true">${remaining}</span></button><button class="primary" data-action="play" ${selected.length !== 3 ? 'disabled' : ''}>${selected.length === 3 ? 'Play ' + G.evaluate(selected).name.replace(/\b\w/g, c => c.toUpperCase()).replace(' Of ', ' of ').replace(' A ', ' a ') : 'Play Three'}</button></div>
    </div>`}
    <p class="notice ${discardWarning ? 'discard-error' : ''}" role="status">${notice}</p>

    ${log.length ? `<details class="history"><summary>Table history &middot; ${log.length} ${log.length===1?'hand':'hands'}</summary>${log.map(l=>`<p>${l}</p>`).join('')}</details>` : ''}
  </section>`;
}
function renderFlexibleCarryChoice() {
  app.className = 'lucky-break-screen flexible-carry-screen';
  app.innerHTML = `<section aria-labelledby="carry-title"><p class="eyebrow">Flexible Carry</p><h1 id="carry-title" tabindex="-1">Choose one to discard.</h1><p class="lucky-instructions">Keep five for the next hand. This choice does not use a normal discard.</p><div class="carry-cards" role="group" aria-label="Choose one of six cards to discard">${state.sides[0].hand.map(c => cardMarkup(c, true, [carryCandidate], 'carry')).join('')}</div>${playerDeckCaption()}<button class="primary lucky-confirm" data-action="carry-confirm" ${carryCandidate === null ? 'disabled' : ''}>Discard selected card</button><p class="lucky-instructions">Confirm your choice to begin the next hand.</p></section>`;
}
function activateFlexibleCarry() {
  if (run.phase !== 'table' || !G.canFlexibleCarry(state)) return;
  G.activateFlexibleCarry(state);
  selected = []; carryCandidate = null; discardWarning = false; notice = '';
  render();
  const heading = app.querySelector('#carry-title');
  if (heading) heading.focus();
}
function renderLuckyBreakChoice() {
  app.className = 'lucky-break-screen';
  app.innerHTML = `<section aria-labelledby="lucky-title"><p class="eyebrow">Lucky Break</p><h1 id="lucky-title" tabindex="-1">Choose one to keep.</h1><p class="lucky-instructions">Both cards have left your deck. The other card goes out.</p><div class="cards lucky-candidates" role="group" aria-label="Choose one candidate">${state.luckyBreak.pending.candidates.map(c => cardMarkup(c, true, [luckyCandidate], 'candidate')).join('')}</div><p class="lucky-context">Your remaining cards</p><div class="opponent lucky-remaining"><div class="cards">${state.sides[0].hand.map(c => cardMarkup(c)).join('')}</div></div>${playerDeckCaption()}<button class="primary lucky-confirm" data-action="lucky-confirm" ${luckyCandidate === null ? 'disabled' : ''}>Keep selected card</button><p class="lucky-instructions">Complete this choice to return to the table.</p></section>`;
}
function activateLuckyBreak() {
  if (run.phase !== 'table' || state.phase !== 'choose') return;
  try { G.activateLuckyBreak(state, [...selected]); }
  catch { notice = 'Lucky Break needs one selected card, one discard, two draw cards and a remaining use.'; render(); return; }
  luckyCandidate = null; discardWarning = false; notice = '';
  render();
  const heading = app.querySelector('#lucky-title');
  if (heading) heading.focus();
}
// Rewards are a run-level phase; enabled passives enter the next encounter through engine.js.
function advanceAfterReward() {
  run.offers = []; run.selectedUpgrade = null;
  bossIndex++; startEncounter();
}
function beginReward() {
  const deferredFinalReward = run.phase === 'complete' && bossIndex === 4 && endless;
  if ((run.phase !== 'table' && !deferredFinalReward) || state.winner !== 0) return;
  if (bossIndex === 4 && !endless) { ending(true); return; }
  run.offers = U.offer(run.upgrades);
  run.selectedUpgrade = null;
  if (!run.offers.length) { advanceAfterReward(); return; }
  run.phase = 'upgrade';
  renderUpgradeSelection();
  const heading = app.querySelector('#reward-title');
  if (heading) heading.focus();
}
function renderUpgradeSelection() {
  app.className = 'upgrade-screen';
  document.body.classList.add('playing');
  app.innerHTML = `<section aria-labelledby="reward-title"><p class="eyebrow">${boss().name} defeated</p><h1 id="reward-title" tabindex="-1">Claim your reward.</h1><p class="upgrade-stage">All six upgrades are enabled.</p><div class="upgrade-offers" role="group" aria-label="Choose one upgrade">
    ${run.offers.map(id => {
      const d = U.get(id), current = run.upgrades[id] || 0, next = current + 1;
      return `<button class="upgrade-choice${run.selectedUpgrade === id ? ' chosen' : ''}" data-action="select-upgrade" data-upgrade="${id}" aria-pressed="${run.selectedUpgrade === id}"><span class="upgrade-meta">${d.type} &middot; ${d.implemented ? 'Enabled' : 'Not yet implemented'} &middot; ${d.unique ? 'Unique &middot; ' : ''}${current ? `Improve: Level ${current} &rarr; ${next}` : `Level ${next} / ${d.maxLevel}`}</span><span class="upgrade-name">${d.name}</span><span class="upgrade-description">${d.levels[next - 1]}</span></button>`;
    }).join('')}
    </div><button class="primary claim-upgrade" data-action="claim-upgrade" ${!run.selectedUpgrade ? 'disabled' : ''}>Claim Upgrade</button></section>`;
}
function claimUpgrade() {
  const id = run.selectedUpgrade;
  if (run.phase !== 'upgrade' || !run.offers.includes(id) || !U.eligible(run.upgrades).some(d => d.id === id)) return;
  run.upgrades = U.collect(run.upgrades, id);
  advanceAfterReward();
  const next = app.querySelector('.encounter-header') || app.querySelector('.ending h1');
  if (next) { next.setAttribute('tabindex', '-1'); next.focus(); }
}
function upgradeCollectionMarkup() {
  const owned = U.definitions.filter(d => run.upgrades[d.id]);
  return `<p class="upgrade-stage">All six upgrades are enabled.</p>${owned.length ? `<ul class="upgrade-collection">${owned.map(d => `<li><h3>${d.name}</h3><p class="upgrade-meta">${d.type} &middot; ${d.implemented ? 'Enabled' : 'Not yet implemented'} &middot; Level ${run.upgrades[d.id]} / ${d.maxLevel}${d.unique ? ' &middot; Unique' : ''}</p><p>${d.levels[run.upgrades[d.id] - 1]}</p></li>`).join('')}</ul>` : '<p>No upgrades collected yet. Defeat a boss to earn your first reward.</p>'}`;
}
// Resource errors do not bubble; capture them across subsequent UI renders.
app.addEventListener('error', event => {
  if (!event.target.matches('.boss-portrait')) return;
  event.target.hidden = true;
  event.target.nextElementSibling.hidden = false;
}, true);
function ending(won) {
  run.phase = won ? 'complete' : 'defeat';
  app.className = '';
  document.body.classList.remove('playing');
  app.innerHTML = `<section class="ending"><p class="eyebrow">${won ? 'THE FIRST FIVE · COMPLETE' : 'THE ROAD ENDS HERE'}</p><div class="symbol" aria-hidden="true">${won ? '♔' : '♠'}</div><h1>${won ? 'You saw daylight.' : 'The house remembers.'}</h1><p>${won ? 'Five bosses beaten. Walk away a winner, or keep playing against the Undertaker in endless mode.' : `${bossIndex} ${bossIndex===1?'boss':'bosses'} defeated. ${boss().name} took this encounter ${state.wins[1]}–${state.wins[0]}. A new run means a fresh start.`}</p><div class="actions">${won ? '<button class="secondary" data-action="endless">Play endless</button>' : ''}<button class="primary" data-action="start">${won ? 'New run' : 'Try again'}</button></div></section>`;
  const heading = app.querySelector('.ending h1');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
}
app.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target || target.disabled) return;
  if (state?.phase === 'flexible-carry') {
    if (target.dataset.carry !== undefined) {
      const card = Number(target.dataset.carry);
      if (!state.sides[0].hand.includes(card)) return;
      carryCandidate = card; render();
      const chosen = app.querySelector(`[data-carry="${card}"]`);
      if (chosen) chosen.focus({preventScroll:true});
    } else if (target.dataset.action === 'carry-confirm' && carryCandidate !== null) {
      G.resolveFlexibleCarry(state, carryCandidate);
      selected = []; carryCandidate = null; notice = '';
      commitBossDecision();
      render();
      const card = app.querySelector('[data-card]');
      if (card) card.focus({preventScroll:true});
    }
    return;
  }
  if (state?.phase === 'lucky-break') {
    if (target.dataset.candidate !== undefined) {
      const card = Number(target.dataset.candidate);
      if (!state.luckyBreak.pending.candidates.includes(card)) return;
      luckyCandidate = card; render();
      const chosen = app.querySelector(`[data-candidate="${card}"]`);
      if (chosen) chosen.focus({preventScroll:true});
    } else if (target.dataset.action === 'lucky-confirm' && luckyCandidate !== null) {
      G.resolveLuckyBreak(state, luckyCandidate);
      selected = []; luckyCandidate = null; notice = ''; render();
      const card = app.querySelector('[data-card]');
      if (card) card.focus({preventScroll:true});
    }
    return;
  }
  if (run.phase === 'upgrade' && !['select-upgrade','claim-upgrade','start'].includes(target.dataset.action)) return;
  if (target.dataset.card !== undefined) {
    if (run.phase !== 'table') return;
    const card = Number(target.dataset.card);
    if (state.phase !== 'choose') return;
    discardWarning = false; notice = '';
    if (selected.includes(card)) selected = selected.filter(c => c !== card);
    else selected.push(card);
    render(); const focused = app.querySelector(`[data-card="${card}"]`); if(focused) focused.focus({preventScroll:true}); return;
  }
  switch (target.dataset.action) {
    case 'start': run = newRun(); bossIndex = 0; endless = false; startEncounter(); break;
    case 'read-table': {
      if (run.phase !== 'table' || state.phase !== 'choose' || !state.readTheTable.remaining || !state.bossCommitment) return;
      G.readTheTable(state);
      discardWarning = false; notice = ''; render();
      const card = app.querySelector('[data-card]');
      if (card) card.focus({preventScroll:true});
      break;
    }
    case 'flexible-carry': activateFlexibleCarry(); break;
    case 'lucky-break': activateLuckyBreak(); break;
    case 'replace': {
      if (run.phase !== 'table') return;
      if (state.phase !== 'choose') return;
      const side = state.sides[0], remaining = G.remainingDiscards(side);
      discardWarning = false;
      if (!selected.length) notice = 'Select a card to discard first.';
      else if (selected.length > remaining) {
        discardWarning = true;
        notice = `You can only discard ${remaining} ${remaining === 1 ? 'card' : 'cards'}.`;
      } else if (selected.length > side.pile.length) {
        discardWarning = true;
        notice = `Only ${side.pile.length} ${side.pile.length === 1 ? 'card remains' : 'cards remain'} in your draw pile.`;
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
      if (run.phase !== 'table' || selected.length !== 3 || state.phase !== 'choose') return;
      const result = G.reveal(state, [[...selected], bossPlay]);
      log.unshift(`Hand ${state.handNumber}: you ${result.plays[0].map(G.label).join(' ')} · boss ${result.plays[1].map(G.label).join(' ')} · ${result.result > 0 ? 'you win' : result.result < 0 ? 'boss wins' : 'tie'}`);
      notice = ''; discardWarning = false;
      if (state.winner === 0 && bossIndex === 4 && !endless) ending(true);
      else render();
      break;
    }
    case 'next': {
      if (run.phase !== 'table' || state.winner !== null || state.phase !== 'reveal') return;
      const refreshed = G.nextHand(state); selected = []; discardWarning = false;
      commitBossDecision();
      notice = refreshed ? 'Decks exhausted: both sides received fresh decks and five new cards. Score kept.' : '';
      render(); break;
    }
    case 'victory': beginReward(); break;
    case 'select-upgrade': {
      const id = target.dataset.upgrade;
      if (run.phase !== 'upgrade' || !run.offers.includes(id)) return;
      run.selectedUpgrade = id; renderUpgradeSelection();
      const choice = app.querySelector(`[data-upgrade="${id}"]`);
      if (choice) choice.focus({preventScroll:true});
      break;
    }
    case 'claim-upgrade': claimUpgrade(); break;
    case 'loss': if (run.phase === 'table' && state.winner === 1) ending(false); break;
    case 'endless': if (run.phase !== 'complete' || endless) return; endless = true; beginReward(); break;
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
const upgradesDialog = document.getElementById('upgrades-dialog');
const upgradesToggle = document.getElementById('upgrades-toggle');
upgradesToggle.addEventListener('click', () => {
  document.getElementById('upgrades-content').innerHTML = upgradeCollectionMarkup();
  if (upgradesDialog.open) return;
  upgradesDialog.showModal();
  upgradesToggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('upgrades-open');
  document.getElementById('upgrades-close').focus({preventScroll:true});
});
document.getElementById('upgrades-close').addEventListener('click', () => upgradesDialog.close());
upgradesDialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); upgradesDialog.close(); }
  else if (event.key === 'Tab') {
    const stops = upgradesDialog.querySelectorAll('button, [tabindex="0"]');
    const first = stops[0], last = stops[stops.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
upgradesDialog.addEventListener('close', () => {
  upgradesToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('upgrades-open');
  upgradesToggle.focus({preventScroll:true});
});
intro();
