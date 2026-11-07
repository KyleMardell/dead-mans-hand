# Dead Man's Hand: project status

## Current milestone

The playable mobile web roguelite now has fifteen boss identities across five initial encounters, all six functional run upgrades and a complete introduction/reward/result flow. It remains buildless HTML/CSS/JavaScript, using Node 24 for local tools and no external runtime dependencies. The owner has reported completing a full five-boss run; that is human playtesting evidence, not a measured balance study or confirmation of a particular device.

The owner has playtested and approved the 28-card, first-to-three encounter format as the official game rules. Each side independently shuffles 8 through Ace in four suits. Exact ties award no point. Three chips per side track the remaining hand losses before defeat. Last Stand starts at the next-hand boundary when the boss is one win from victory (two hand wins), adding two discards to the normal/Quick Draw allowance.

The central `engine.js` configuration remains `rules: { lowestRank: 8, winsRequired: 3 }`. All six upgrade effects and limits otherwise remain unchanged, as do the five boss policies, per-boss reward cadence and Endless progression.

Implemented presentation and interaction:

- Illustrated boss wanted posters and six illustrated upgrade cards, with preserved proportions, accessible descriptions and text fallbacks. Artwork text does not determine upgrade effects.
- A compact mobile table with poker chip scores, discard selection feedback, player draw-pile information and persistent Hand Won / Hand Lost / Dead Heat results with styled hand comparisons.
- Accessible How to Play and Upgrades dialogs. The guide includes miniature ranking examples and current rule explanations.
- Dismissible hand result overlays lasting about 1.4 seconds; they preserve showdown underneath and never advance gameplay automatically.
- Dedicated Boss Defeated, Run Over and Run Complete screens. Boss Defeated adds a decorative painted red X; other screens do not. Transition buttons work during entrance animations, and reduced motion removes the animations.
- A wanted-poster introduction before every encounter, including the first selected opponent and every Endless encounter. No deck or boss commitment is created before Face the Boss.
- A simplified home screen with the gold tagline beneath the title and its footer hidden.

## Upgrades and progression

Quick Draw, Lucky Break, Flexible Carry, Read the Table, Last Stand and Peek Ahead are implemented. Last Stand is unique with one level; the other five upgrades have two levels. Levels, eligibility and artwork metadata come from `upgrades.js`; gameplay effects and accounting are in `engine.js`, with UI and run transitions in `app.js`. See GAME_DESIGN.md for exact effects and reset boundaries.

Bosses 1-4 lead from Boss Defeated through reward selection to the next introduction. One of up to three eligible offers is explicitly claimed. Run defeat leads to Run Over, then the existing summary/restart flow. Completing boss five immediately shows Run Complete; its reward is generated only after choosing Endless. New Run abandons that reward and clears the collection. Endless retains upgrades and encounter-five difficulty, offers rewards while eligible and always introduces the next encounter, even with an exhausted pool.

## Boss roster and selection

Fifteen supplied PNG posters are centrally mapped in `engine.js`, preserving exact filenames and dimensions. Character identity is separate from the five existing encounter-position AI policies; the 28-card, first-to-three rules and six upgrade effects are unchanged.

A new run selects four distinct characters from the twelve regular bosses, then one of The Undertaker, The Widow or The Preacher for encounter five. Those three cannot appear earlier in the initial run. The full lineup stays hidden; the current character is revealed at the introduction and stays consistent through the encounter.

Endless uses shuffled cycles of all fifteen characters, with no consecutive duplicate across the initial final/Endless boundary or between cycles. Every Endless encounter uses the existing fifth policy. New Run clears the cycle and collection and creates a new initial lineup. The fifth reward remains deferred until choosing Endless; rewards still occur once per defeated boss.

## Validation record and current confidence

### Historical import validation

The original ten automated tests covered all 2,024 triple rankings, kickers/equal suits, discard limits, carryover, card accounting, forced exhaustion, reproducibility and five-boss/defeat/Endless UI transitions. All ten passed again after import under Node 24.21.0. The original handoff also reported browser checks for selection, discarding, showdown, carryover, first victory and boss-two advancement at 390 x 844. These are historical results, not a current complete validation claim.

### Subsequent development checks

Earlier upgrade/UI milestones reported a full suite of 70 passing tests. Later presentation, milestone and introduction work used focused regression and headless Chrome checks rather than rerunning the full suite after every change. Reported checks included 390 x 844 and 360 x 640 layouts where relevant, keyboard focus/dismissal, reduced motion, immediate transition controls, reward deferral, reset and duplicate-action guards. The latest painted-X/home polish also received a focused desktop visual check.

A later end-of-session checkpoint passed the full 78-test suite and a representative controlled browser playthrough. The subsequent encounter-format implementation passed 81 relevant tests: 38 engine/upgrade checks, three additional format regressions and 40 UI checks. Those checks covered 28-card accounting, 8s, first-to-three scoring, relative Last Stand timing, other upgrade interactions, rewards, completion, Endless and restoration through the central settings. A focused 390 x 844 browser check confirmed usable three-chip spacing, visible gameplay controls and no horizontal overflow; showdown history can extend slightly below the viewport. The owner then playtested and approved the new format.

These records apply to the versions checked at the time. They do not establish physical iOS/Android behaviour or actual screen-reader usability. No further test run is needed for this documentation-only approval update.

**Documentation refresh, 2026-11-07:** source and documentation review only. No automated tests, browser checks or simulations were run for this documentation task.

**Rules approval documentation update, 2026-11-07:** documentation consistency review only, relying on the recent 81 passing checks and owner playtesting. No automated tests, browser checks or simulations were rerun.

**Fifteen-boss roster checks:** 47 focused roster/UI tests passed, covering exact artwork mappings, seeded lineup constraints, unchanged policies selected by encounter position, identity consistency, new-run reset, rewards/upgrades and multiple Endless cycles without consecutive duplicates. All fifteen PNGs returned HTTP 200 as image/png and decoded at their mapped dimensions. Focused 390 x 844 checks covered The Widow and the three posters with differing dimensions, plus Snake Oil Man gameplay and a missing-image text fallback. Controls stayed visible with no horizontal overflow. No full automated suite or balance simulations were rerun for this feature.

### Test helper convention

`tests/app.test.cjs` uses deterministic engine fixtures and a lightweight DOM stub. `setup()` defaults to `{autoFaceBoss: true}` so existing table-mechanics fixtures pass through introductions automatically. Tests of real introduction/progression barriers must use `setup(U, {autoFaceBoss: false})` (or the equivalent wrapped upgrade registry), explicitly press Face the Boss and check the intermediate phase. Existing showdown fixtures also dismiss ordinary hand overlays by default; overlay-specific cases opt out. DOM fixtures do not replace relevant browser interaction checks.

## Historical simulation findings

The supplied `simulation-results.json` is the baseline: 5,000 encounters for each of seven strategy comparisons and five boss comparisons, 60,000 total. Seed 20261105, independently shuffled 24-card decks (9 through Ace), first to two wins, no upgrades, alternating strategy seats and 95% Wilson intervals. These are measurements of the earlier game, not the approved 28-card, first-to-three format. Browser play and simulation share `engine.js`; future simulations use the current central rules and must record their actual configuration rather than inherit the baseline assumptions.

| Strategy comparison | Encounter wins | 95% Wilson interval |
|---|---:|---:|
| Greedy vs identical greedy | 49.96% | 48.57-51.35% |
| Greedy vs random | 95.66% | 95.06-96.19% |
| Conservation vs greedy, neither discarding | 52.66% | 51.27-54.04% |
| Informed discard + greedy vs greedy without discards | 71.82% | 70.56-73.05% |
| Lowest-card discard + greedy vs greedy without discards | 63.90% | 62.56-65.22% |
| Informed discard vs lowest-card discard | 59.46% | 58.09-60.81% |
| Conservation + informed discard vs informed greedy | 54.84% | 53.46-56.22% |

These compare complete heuristic strategy packages, not isolated proof of a decision's value or evidence of optimal play. See GAME_DESIGN.md for strategy assumptions.

| Boss | Informed greedy simulated player's encounter win rate |
|---|---:|
| The Drifter | 96.80% |
| The Gambler | 84.68% |
| The Deputy | 80.88% |
| The Sheriff | 71.12% |
| The Undertaker | 50.34% |

Multiplying the five boss rates gives an estimated 23.74% run completion rate, assuming independent encounters. This is not a measured human completion rate or a locked difficulty target.

In that earlier 24-card, first-to-two baseline, tied hands occurred about 1.66-8.08% of the time; deck refresh exceptions occurred in 0-0.24% of encounters. Average encounters lasted about 2.25-2.73 hands; five bosses do not always mean fifteen hands. The maximum observed encounter length was eight hands. With one discard each hand, five full hands consume 22 cards and a sixth requires 26; without discards, seven full hands fit.

## Known limitations and deferred features

- Runs are in-memory only. Refreshing or navigating home resets progress; there is no save/resume.
- Current human balance, upgrade combinations and performance are not comprehensively measured. Historical simulations exclude upgrade effects and do not establish present-day completion rates.
- Physical-device testing, screen-reader behaviour and broader accessibility need a confirmed validation record. Do not assume that headless mobile emulation establishes these.
- Large supplied PNGs remain unmodified and may load slowly on mobile connections. Intrinsic sizing and text fallbacks mitigate presentation failures, not download size.
- The local preview server binds only to 127.0.0.1 and does not provide a phone-sharing address. `captain-definition` prepares Nginx-based static serving on container port 80; its presence does not prove a build or deployment has occurred.
- Current repository visibility, remote/push status, live hosting and any physical-device testing require owner confirmation. This document makes no claim about their present state.
- No shop, currency, permanent progression/unlocks, account, backend or multiplayer is implemented. Those remain deferred, alongside save/resume. No license has been selected.

## Historical provenance

The original local prototype was imported from `C:\Users\kyles\Documents\Codex\2026-11-05\referenced-chatgpt-conversation-this-is-an\outputs\dead-mans-hand` into `C:\Users\kyles\Documents\GitHub\dead-mans-hand`. The handoff recorded that the editable source, source ZIP and standalone playable HTML remained in the original output directory; the repository's editable files are the development source of truth, not the standalone export.

At import, runtime files, tests and simulation results were preserved, and repository guidance/ignores/documentation were added. The original workspace was recorded as having no commits, pushes or deployment; an empty private remote and user-performed initial push were setup intentions. These statements describe that handoff only and must not be treated as current repository or hosting facts.
