# Dead Man's Hand: game design

## Agreed experience and rules

A mobile web card roguelite about managing a small poker deck across consecutive hands: choose what wins now and what to preserve for later. Keep the existing portrait-friendly Western card table presentation.

- Each side has an independently shuffled 24-card deck: 9, 10, J, Q, K and Ace in four suits.
- Start each hand holding five cards. Optionally discard and immediately replace one card before selecting three to play. Replacement is unavailable when the draw pile is empty.
- Resolve the selected triples simultaneously. Keep the other two cards and draw back to five for the next hand.
- Played and discarded cards remain unavailable for the encounter, except for the approved exhaustion exception below.
- Rankings: straight flush > three of a kind > straight > flush > pair > high card. Compare ranks and kickers normally. Suits are equal. Ace is high; A-9-10 is not a straight.
- First to two hand wins takes the encounter. Exact ties award neither side a point; continue playing.
- Approved exhaustion exception: if either side cannot refill to five, BOTH sides receive fresh decks and five new cards, retaining encounter scores. Announce this clearly.
- Losing one boss encounter ends the entire run. There are no lives or retries within a run.
- Beat five bosses to complete the initial run; endless mode is optional afterward.
- Player and bosses have identical rule permissions. Difficulty comes from AI decisions, not privileged cards or guaranteed outcomes.
- Bosses must not see hidden player cards or the order of their future draws. The prototype commits boss decisions before player actions.

## Current boss implementation

| Boss | Strongest-three selection | Replacement policy |
|---|---:|---|
| The Drifter | 15% of hands; otherwise random | None |
| The Gambler | 45%; otherwise random | Lowest card |
| The Deputy | 75%; otherwise random | None |
| The Sheriff | 100% | None |
| The Undertaker | 100% | Informed expected value |

These are initial skill settings, not locked balance targets. Endless repeats the fifth boss's skill level. Every boss may legally replace a card; some policies elect not to.

## Strategy assumptions

Greedy chooses the strongest available triple; random selects a legal triple uniformly. Conservation scores current win equity plus 0.65 times expected next-hand equity from the pair kept. At 1-1 it uses greedy selection. The weight was chosen before the reported simulations. Its fresh-deck future estimate does not fully model depletion.

Informed replacement averages possible replacements from the unordered remaining card pool and discards only when expected strategy score improves. It does not know the next draw or opponent's hand. Equity is based on the exact distribution of the strongest triple from a fresh random five-card hand. These remain heuristic strategies, not optimal play.

## Future ideas requiring discussion

Between-boss reward choices and persistent unlocks are possible directions, not approved mechanics or a finalized economy. The current MVP intentionally has no shop, upgrades, currency, permanent progression, accounts, backend or multiplayer. Discuss progression and major rules, balance or architecture changes with the user before implementing them.
