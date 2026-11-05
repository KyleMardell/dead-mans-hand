const fs = require('node:fs');
const path = require('node:path');
const G = require('./engine.js');
const n = Number(process.argv[2] || 5000);
if (!Number.isInteger(n) || n < 100 || n > 1000000) throw Error('Use 100–1000000 encounters per matchup.');
G.prepareModel();
function wilson(w, n) { const p = w / n, z = 1.96, d = 1 + z*z/n, mid = (p + z*z/(2*n))/d, half = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d; return [mid - half, mid + half].map(x => +(100*x).toFixed(2)); }
function compare(a, b, offset = 0) {
  let wins = 0, hands = 0, ties = 0, refreshes = 0, exhausted = 0, maxHands = 0;
  for (let i = 0; i < n; i++) {
    // Seeded independent shuffles and decisions; alternate policy seats.
    const flip = i % 2; const r = G.simulate(flip ? b : a, flip ? a : b, 20261105 + offset + i);
    wins += r.winner === flip; hands += r.hands; ties += r.ties; refreshes += r.refreshes; exhausted += r.refreshes > 0; maxHands = Math.max(maxHands, r.hands);
  }
  return { encounters: n, playerWinPct: +(100*wins/n).toFixed(2), ci95: wilson(wins, n), averageHands: +(hands/n).toFixed(3), tiedHandPct: +(100*ties/hands).toFixed(3), encountersRefreshedPct: +(100*exhausted/n).toFixed(3), refreshes, maxHands };
}
const pairs = [['greedy','greedy'],['greedy','random'],['conserve','greedy'],['informed','greedy'],['low','greedy'],['informed','low'],['planner','informed']];
const results = {};
for (const [a,b] of pairs) { results[`${a} vs ${b}`] = compare(G.policies[a], G.policies[b]); console.log(a, 'vs', b, JSON.stringify(results[`${a} vs ${b}`])); }
const bosses = G.bosses.map((b,i) => ({ name:b.name, ...compare(G.policies.informed, b, 100000 + i*10000) }));
const completionEstimate = 100*bosses.reduce((p,b) => p*b.playerWinPct/100, 1);
const result = { seed:20261105, methodology:'Alternating seats; independent 24-card decks; 95% Wilson intervals; informed greedy player for bosses; conservation is a one-step heuristic, not optimal play.', matchups: results, bosses, independentRunCompletionEstimatePct: +completionEstimate.toFixed(2) };
fs.writeFileSync(path.join(__dirname, 'simulation-results.json'), JSON.stringify(result,null,2)+'\n');
console.log('Bosses', JSON.stringify(bosses)); console.log('Estimated five-boss completion',completionEstimate.toFixed(2)+'%');
