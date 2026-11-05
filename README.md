# Dead Man’s Hand — local playtest 01

## Setup and play

Use Node.js 24 and its bundled npm for the preview server, tests and simulations. There are no external dependencies and no build step; `npm install` is not required.

From this project directory:

```sh
npm start
```

Open http://127.0.0.1:4173 and choose **Take a seat**. Stop the server with Ctrl+C. If Windows PowerShell blocks `npm.ps1`, use `npm.cmd start`, `npm.cmd test` and `npm.cmd run simulate -- 5000`; no execution policy change is needed.

Open **index.html** in a browser and choose **Take a seat**. No installation or connection is needed. Refreshing the page starts over; this prototype does not save runs.

For a local preview, run `npm start` in this folder and open http://127.0.0.1:4173. Stop the server with Ctrl+C. It listens only on this computer. To test on a phone, copy the folder to that device and open index.html in a browser that supports local HTML and companion scripts; there is no hosted/mobile sharing URL.

## Findings

The core looks viable for a playtest. Card conservation helped a little, while informed discarding helped much more. Fun, pacing and human difficulty still need hands-on testing. No claims about optimal play.

5,000 encounters per comparison, 60,000 total, seeded independent decks and alternating strategy seats:

| Strategy vs opponent | Encounter wins | 95% interval |
|---|---:|---:|
| Greedy vs greedy | 49.96% | 48.57–51.35% |
| Greedy vs random | 95.66% | 95.06–96.19% |
| Conservation vs greedy, neither discards | 52.66% | 51.27–54.04% |
| Informed discard vs greedy without discards | 71.82% | 70.56–73.05% |
| Lowest-card discard vs greedy without discards | 63.90% | 62.56–65.22% |
| Informed discard vs lowest-card discard | 59.46% | 58.09–60.81% |
| Conservation + informed discard vs informed greedy | 54.84% | 53.46–56.22% |

Everyone has the same permission to discard; some strategies elect not to. These are comparisons of complete strategy packages, not isolated proof of a single decision's value.

**Bosses:** against an informed greedy player, win rates are Drifter 96.80%, Gambler 84.68%, Deputy 80.88%, Sheriff 71.12%, Undertaker 50.34%. Their product estimates **23.74% five-boss completion**, assuming independent fresh encounters. This is not a measured human completion rate. Average encounters took 2.25–2.73 hands; five bosses do not always mean 15 hands.

**Ties and exhaustion:** equal hands award neither side a point; ranks and kickers break ordinary ties, never suits. Tied hands were 1.66–8.08% of hands across the tested matchups. Fresh-deck exceptions occurred in 0–0.24% of encounters (maximum observed length: eight hands). With a discard every hand, five full hands consume 22 cards; a sixth needs 26. Without discards, seven full hands fit. Following the user's explicit approval, when either side cannot refill to five, both decks and hands refresh, with score retained. No cards return before that exception or the next boss. Replacing is unavailable if the draw pile is empty.

## What the strategies know

- Greedy chooses the strongest available three; random chooses a legal triple uniformly.
- Conservation scores each choice as current win equity + 0.65 × expected next-hand equity from the two cards kept. The future estimate averages fresh-deck five-card hands containing that pair; it does not fully account for depleted decks. At 1–1, it uses greedy play. The fixed weight was chosen before the reported simulations, not fitted to these results.
- Informed replacement checks all remaining possible replacement cards, choosing a discard only if its expected strategy score improves. It knows its own removed cards, not the next draw or the opponent's hand. Expected equity uses the exact distribution of the strongest three from a fresh random five-card hand, so this remains a heuristic.
- Bosses 1–4 use strongest-three decisions on 15%, 45%, 75% and 100% of hands, otherwise random. Boss 2 also replaces its lowest card; boss 5 always uses greedy selection and informed replacement. These are initial skill settings for review, not locked balance targets. Endless repeats boss 5's skill.

## Rules and scope

Separate 24-card 9–Ace decks, five cards held, optionally replace one, play three, keep two, first to two wins. One encounter defeat ends the run. Five bosses, optional endless, no shop or upgrades. Boss decisions are committed before player decisions. Standard Three Card Poker order is straight flush > trips > straight > flush > pair > high card; Ace is high in this stripped deck. [Ranking reference: Pennsylvania Code §649a.6](https://www.pacodeandbulletin.gov/secure/pacode/data/058/chapter649a/s649a.6.html).

## Reproduce

```sh
npm test
npm run simulate -- 5000
```

The simulation command accepts 100-1,000,000 encounters per comparison (5,000 by default), performs twelve comparisons, and **overwrites the checked-in baseline** in `simulation-results.json`. Preserve or review that file before committing a new run. The measurements above describe the supplied 5,000-encounter baseline.

Node 24; no dependencies. `npm test` checks the full 2,024-triple category distribution, ranking/kicker rules, card accounting, forced exhaustion, strategy reproducibility and five-boss/defeat/endless UI transitions. `npm run simulate -- 5000` reruns the complete comparison and writes **simulation-results.json**, including Wilson intervals, ties, refreshes and seeds. Engine logic is shared by the harness and browser.

Historical browser check: replacement, selection, reveal, carryover, first encounter victory and advancing to boss two; responsive viewport at 390×844. Automated fixtures cover later run branches; actual iOS/Android touch behavior and session persistence are not verified.

## Project map and handoff

- `index.html`, `style.css`, `app.js`: the playable interface and run flow.
- `engine.js`: shared rules, ranking, card accounting, AI and simulation encounter logic.
- `server.cjs`: loopback-only local preview server.
- `simulate.cjs`, `simulation-results.json`: seeded comparison harness and historical baseline.
- `tests/`: Node built-in engine tests and deterministic UI transition fixtures.
- [Game design](docs/GAME_DESIGN.md): agreed rules, current AI and future ideas requiring discussion.
- [Project status](docs/PROJECT_STATUS.md): provenance, findings, validation and limitations.
- [Agent guidance](AGENTS.md): small-step development workflow.

This repository setup preserves the prototype's gameplay and visual direction. No license has been selected. No push, deployment, publishing or hosting is part of setup. Once `origin` points to the verified empty private GitHub repository, the user can perform the initial push:

```sh
git push -u origin main
```
