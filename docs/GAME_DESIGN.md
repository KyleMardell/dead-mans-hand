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
- Base player and boss permissions match. Quick Draw grants the player additional discards; bosses retain one discard per hand. Boss difficulty still comes from AI decisions, not privileged cards or guaranteed outcomes.
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

The approved foundation offers up to three uniformly sampled, distinct upgrade choices after victories over bosses 1 to 4. Claim one before advancing. Defeating the fifth boss immediately shows the completion screen, without generating a reward. Choosing Endless generates the deferred fifth reward; claim one before the first endless encounter, or advance directly if no eligible upgrades remain. Choosing New run instead clears the run without offering that reward. Endless mode continues rewards while eligible upgrades remain and advances normally once everything is maxed.

`upgrades.js` is the central registry for Quick Draw, Lucky Break, Flexible Carry, Read the Table, Last Stand and Peek Ahead, their descriptions and levels. Owned upgrades can be offered at their next level; maxed upgrades and collected unique Last Stand are excluded. Collection belongs to the current run, survives entry to endless and resets on New run. Refresh still resets the session.

**Quick Draw is enabled:** Level 1 grants two player discards per hand; Level 2 grants three. They may be used separately or together, reset each hand and survive bilateral deck refreshes. Requested batches must fit both the remaining allowance and the draw pile; rejected batches consume nothing. Bosses stay at one discard per hand. **Lucky Break is enabled:** select exactly one held card and activate it before showdown. It spends one normal discard and one use, puts the original card out and draws the next two cards into a required choice. Confirm one to restore the five-card hand; the other goes out. Level 1 grants one activation per boss and Level 2 grants two. At least two draw cards are required. Pending candidates count toward card accounting; discarding and showdown are locked until confirmation. Uses persist through hands and bilateral refreshes, reset at each boss, and the upgrade resets on a new run. **Flexible Carry is enabled:** after a non-final showdown, optionally retain two and draw four, then confirm one of the six cards for the out pile. It spends no normal discard or Lucky Break use. Level 1 grants one use per boss and Level 2 grants two. Activation requires four player draw cards and enough cards for both sides to refill normally; otherwise the normal refill and bilateral exhaustion rule take precedence. The next hand begins only after the six-card choice is confirmed. Uses persist through hands and deck refreshes, reset at each boss, and the upgrade resets on a new run. **Read the Table is enabled:** once per boss at either level, reveal ranks from one (Level 1) or two distinct (Level 2) randomly selected cards in the already committed boss trio. Distinct cards may share a rank. Suits, unselected cards and future draw order remain hidden. A rank-only hint appears at the actual card position among five backs and persists through player discards and Lucky Break until showdown. New hands and refreshes clear old hints and commitments without restoring the use; a new boss restores it. It spends no discard. The engine freezes the committed trio, prevents further boss discards or decisions and rejects a different showdown trio. **Last Stand is enabled:** this unique passive adds two player discards at the next-hand boundary once the boss has one hand win. It adds to the base Quick Draw allowance (totals 3, 4 or 5), never retroactively changes the completed hand, and never stacks across ties. It applies after a normal refill, Flexible Carry confirmation or bilateral refresh; bosses retain one discard. It ends when the encounter ends and starts inactive at the next boss. **Peek Ahead is enabled:** a compact player draw-pile indicator is always visible. Without ownership it shows a back; Level 1 shows only the actual next rank, with neutral colour and no suit in accessible text; Level 2 adds the suit. Empty piles show an empty state. A read-only query of the first player pile card updates with every render, including pending Lucky Break and Flexible Carry choices, normal refills, bilateral refreshes and new encounters. It spends nothing, makes no random calls and never changes deck order or boss information. All six initial upgrades are functional. Further balance changes and permanent unlocks require discussion. There is no shop, currency, permanent progression, account, backend or multiplayer.
