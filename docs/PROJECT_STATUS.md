# Dead Man's Hand: project status

## Stage and provenance

Working early local prototype, not production-ready. Imported by copying the complete editable source from `C:\Users\kyles\Documents\Codex\2026-11-05\referenced-chatgpt-conversation-this-is-an\outputs\dead-mans-hand` into `C:\Users\kyles\Documents\GitHub\dead-mans-hand`. The original source, source ZIP and standalone playable HTML remain in the original outputs directory. The editable source is the development project; the standalone export is not the source of truth.

The import preserves runtime files, tests and simulation results unchanged. Setup adds repository guidance, ignores and documentation. The original workspace had no Git commits, pushes or deployment. This setup prepares a local initial commit and an empty private remote if available; the user performs the initial push. No license has been selected.

## Historical simulation findings

The supplied `simulation-results.json` is the baseline: 5,000 encounters for each of seven strategy comparisons and five boss comparisons, 60,000 total. Seed 20261105, independently shuffled decks, alternating strategy seats, 95% Wilson intervals. Browser play and simulation share `engine.js`.

| Strategy comparison | Encounter wins | 95% Wilson interval |
|---|---:|---:|
| Greedy vs identical greedy | 49.96% | 48.57-51.35% |
| Greedy vs random | 95.66% | 95.06-96.19% |
| Conservation vs greedy, neither discarding | 52.66% | 51.27-54.04% |
| Informed discard + greedy vs greedy without discards | 71.82% | 70.56-73.05% |
| Lowest-card discard + greedy vs greedy without discards | 63.90% | 62.56-65.22% |
| Informed discard vs lowest-card discard | 59.46% | 58.09-60.81% |
| Conservation + informed discard vs informed greedy | 54.84% | 53.46-56.22% |

These compare complete heuristic strategy packages, not isolated proof of a decision's value or evidence of optimal play. See GAME_DESIGN.md and README.md for assumptions.

| Boss | Informed greedy simulated player's encounter win rate |
|---|---:|
| The Drifter | 96.80% |
| The Gambler | 84.68% |
| The Deputy | 80.88% |
| The Sheriff | 71.12% |
| The Undertaker | 50.34% |

Multiplying the five boss rates gives an estimated 23.74% run completion rate, assuming independent encounters. This is not a measured human completion rate or a locked difficulty target.

Across comparisons, tied hands occurred about 1.66-8.08% of the time; deck refresh exceptions occurred in 0-0.24% of encounters. Average encounters lasted about 2.25-2.73 hands; five bosses do not always mean fifteen hands. The maximum observed encounter length was eight hands. With one discard each hand, five full hands consume 22 cards and a sixth requires 26; without discards, seven full hands fit.

## Validation and limits

The original ten automated tests cover all 2,024 triple rankings, kickers and equal suits, discard limits, carryover, card accounting, forced exhaustion, reproducibility, and UI transitions for five-boss completion, defeat and endless mode. All ten passed again after import under Node 24.21.0.

The handoff reported browser checks for selection, replacement, showdown, carryover, victory and advancing to boss two, plus a 390 by 844 viewport without horizontal overflow. Those are historical checks; automated UI fixtures are not real browser or device tests.

Real iOS/Android touch testing, human balance and playability, deeper accessibility and performance still need validation. Refreshing resets a run; there is no save/resume. The local server binds only to 127.0.0.1 and supplies no phone sharing URL. No external runtime dependencies, framework or build step are required; Node 24 was used.

## Next small step

Run a focused real-device portrait playtest on iOS and Android, recording touch selection/replacement behavior, readability, overflow and encounter pacing before changing mechanics. Progression remains a discussion item; see GAME_DESIGN.md.
