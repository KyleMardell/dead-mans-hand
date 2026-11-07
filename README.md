# Dead Man's Hand

A mobile web Three Card Poker roguelite: play three, keep two, and manage a small deck through five Western opponents. The current game includes six functional run upgrades, illustrated rewards, boss introductions and dedicated result screens.

## Run locally

Use Node.js 24 and its bundled npm. There are no external dependencies or build step; `npm install` is not required.

```sh
npm start
```

Open http://127.0.0.1:4173. Choose **Take a seat**, then **Face the Boss** to begin against the Drifter. Stop the server with Ctrl+C. The preview server listens only on this computer.

If PowerShell blocks `npm.ps1`, use `npm.cmd start` or `npm.cmd test`; do not change the execution policy. The game can also be opened through `index.html` in a browser supporting local HTML and companion scripts, but use the preview server for consistent development checks.

## Game and progression

Each side has its own independently shuffled 28-card deck: 8, 9, 10, J, Q, K and Ace in four suits. Hold five cards, optionally discard within your allowance, then select three for showdown. Keep the other two and normally draw three for the next hand. Played and discarded cards stay out until a new boss or the bilateral deck refresh exception.

The base allowance is **one discard per hand**. Quick Draw raises it to two or three; Last Stand adds two when active. Discards can be used together or separately, provided enough cards remain to draw. Bosses retain a maximum allowance of one. The approved encounter settings are centralised in `engine.js` as `rules`: `lowestRank: 8, winsRequired: 3`.

Rankings are straight flush > three of a kind > straight > flush > pair > high card. Ace is high, suits are equal, and exact ties award no point. First to win three hands takes the encounter. Each side starts with three poker chips; losing a hand spends one chip using the bullet-hole effect. Ties consume no chips. If either side cannot refill normally, both receive fresh decks and five cards while keeping the encounter score.

Face **The Drifter → The Gambler → The Deputy → The Sheriff → The Undertaker**, with increasingly challenging decision policies. Losing an encounter ends the run.

- Bosses 1-4: **Boss Defeated → Choose Upgrade → claim → next boss introduction → Face the Boss**.
- Defeat: **Run Over → Run Summary → Try again → Drifter introduction**.
- Fifth victory immediately shows **Run Complete**. **Endless Mode** then offers the earned fifth reward before the next introduction; **New Run** clears the run instead. No fifth reward is generated before choosing Endless.
- Endless repeats Undertaker difficulty. Rewards continue while upgrades remain eligible; an exhausted pool skips selection but never skips the next introduction.

## Run upgrades

After a boss victory, choose one of up to three distinct, randomly offered eligible upgrades. They persist through the run and into Endless. Collect an upgrade again to improve its level; maxed upgrades and an owned unique upgrade are excluded. New Run clears the collection.

| Upgrade | Effect |
|---|---|
| Quick Draw | Two discards per hand at Level 1; three at Level 2. |
| Lucky Break | Spend one discard to draw two candidates and keep one; one use per boss, or two at Level 2. |
| Flexible Carry | Between hands, draw four alongside the two retained cards, then discard one of six; one use per boss, or two at Level 2. No normal discard is spent. |
| Read the Table | Once per boss, reveal ranks from one committed boss card, or two distinct cards at Level 2. Suits stay hidden. |
| Last Stand | Unique: starting next hand when the boss is one win from victory (two hand wins), add two discards per hand for that encounter. |
| Peek Ahead | Always show the next player draw's rank; Level 2 adds its suit. |

Limited ability uses reset per boss, not per hand or deck refresh. See [GAME_DESIGN.md](docs/GAME_DESIGN.md) for requirements, accounting and edge cases. The How to Play guide and Upgrades dialog are available from the navigation.

## Development and project map

Use focused checks for small changes; reserve broader regression checks for substantial feature/session checkpoints. [AGENTS.md](AGENTS.md) defines the workflow. Available commands include:

```sh
node --test --test-name-pattern="boss introduction" tests/app.test.cjs
npm test
```

The first selects relevant UI tests; the second runs the full suite. These are commands, not a claim that current checks have been executed.

| Location | Responsibility |
|---|---|
| `engine.js` | Shared poker rules, card accounting, AI, gameplay effects and simulation encounter logic. |
| `upgrades.js` | Upgrade definitions, levels, eligibility, descriptions and artwork metadata. |
| `app.js`, `index.html`, `style.css` | Browser interaction, run flow, dialogs, rendering and visual treatment. |
| `assets/images/bosses/` | Supplied boss wanted-poster PNGs. |
| `assets/images/upgrades/` | Supplied illustrated upgrade PNGs; exact paths and dimensions are in `upgrades.js`. |
| `server.cjs` | Loopback-only local preview server. |
| `tests/` | Node built-in engine, upgrade and deterministic UI regression tests. |
| `simulate.cjs`, `simulation-results.json` | Seeded comparison harness and preserved historical baseline. |
| `captain-definition` | CapRover definition using Nginx on container port 80 to serve browser files and artwork. Its presence does not establish deployment status. |

`npm run simulate -- 5000` performs twelve seeded comparisons and **overwrites `simulation-results.json`**. It is for a defined balance investigation, not routine UI verification. [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) retains the original findings and their limitations; those preserved simulations used the earlier 24-card, first-to-two format and exclude upgrade effects. They do not measure the approved format.

## Limitations and further information

Runs are held in memory: refreshing or navigating home resets progress. There is no save/resume, shop, currency, permanent progression, account, backend or multiplayer. Human balance, physical-device behaviour, broader accessibility and performance require further validation; prior focused checks do not establish comprehensive coverage of the latest code.

Repository visibility, live hosting and physical-device test status need owner confirmation. No license has been selected.

- [Game design](docs/GAME_DESIGN.md): implemented rules, screen flows, UI conventions and deferred ideas.
- [Project status](docs/PROJECT_STATUS.md): current milestone, historical validation and open limitations.
