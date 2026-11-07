# Dead Man's Hand: game design

## Approved core mechanics

A mobile web Three Card Poker roguelite about choosing what wins now and what to conserve for later. Preserve the portrait-friendly Western card table and buildless implementation.

- Each side has an independently shuffled 28-card deck: 8, 9, 10, J, Q, K and Ace in four suits.
- Hold five cards. The base allowance is one optional discard per hand, modified for the player by Quick Draw and Last Stand. Each discarded card immediately draws one new card. Use allowances together or separately; a requested batch must fit both the remaining allowance and draw pile. Invalid requests consume nothing.
- Select three cards for simultaneous showdown against the boss's committed three. Discarding is optional. Normally retain the other two cards and draw three for the next hand. Flexible Carry is the approved alternative below.
- Played and discarded cards enter that side's out pile and stay unavailable until the next encounter or the deck refresh exception.
- Rankings: straight flush > three of a kind > straight > flush > pair > high card. Compare relevant ranks and kickers; suits have equal value. Ace is high, and A-9-10 is not a straight.
- First to three hand wins takes the encounter. Exact ties award neither side a point; both sides still put their played cards out and continue to another hand.
- Each side starts with three intact poker chips. Losing a hand marks one of that side's chips spent with the bullet-hole effect; ties spend no chips.
- If either side cannot refill normally to five, **both sides receive freshly shuffled decks and five new cards**, retaining the encounter score. This replaces the retained cards too. The table announces the refresh.
- Bosses retain a maximum allowance of one discard per hand. Their difficulty comes from decisions, not privileged cards or guaranteed outcomes.
- The boss decision is committed before player selection or discarding. Boss AI cannot see hidden player cards or future draw order; Read the Table reveals information from the existing commitment without allowing it to change.
- One encounter loss ends the run. Five victories complete the initial run; Endless is optional. Run upgrades persist between bosses and into Endless, but New Run or a page refresh clears them. There is no save/resume.

The 28-card, first-to-three format is approved following owner playtesting. `engine.js` centralises the encounter configuration in the frozen `rules` object (`lowestRank: 8, winsRequired: 3`); deck composition, scoring, chip counts and live rule instructions derive from it.

## Boss progression and decision policies

| Boss | Strongest-three selection | Discard policy |
|---|---:|---|
| The Drifter | 15% of hands; otherwise random | None |
| The Gambler | 45%; otherwise random | Lowest card |
| The Deputy | 75%; otherwise random | None |
| The Sheriff | 100% | None |
| The Undertaker | 100% | Informed expected value |

These are implemented skill settings, not locked balance targets. Bosses may elect not to use their allowance. Endless continues with the Undertaker's artwork and decision policy, without adding new difficulty tiers.

## Implemented upgrades and rewards

`upgrades.js` owns the central definitions, levels, eligibility, descriptions and artwork metadata. `engine.js` applies gameplay effects; `app.js` manages the run collection, selection and transitions. Behaviour comes from code, not wording embedded in an illustration.

Offer up to three uniformly sampled, distinct eligible upgrade identities after a boss victory. A collected upgrade can be offered at its next level; all levels are capped at two except unique Last Stand, capped at one. Maxed upgrades and an owned Last Stand are excluded. The player explicitly selects and claims one; nothing is awarded automatically. Fewer eligible upgrades mean fewer choices. An empty pool skips selection and continues to the next introduction.

The fifth reward is deferred until the player chooses Endless from Run Complete. It is not generated or consumed before that choice and is abandoned on New Run. Subsequent Endless victories follow the same eligibility and reward rules.

| Upgrade | Level 1 | Level 2 |
|---|---|---|
| Quick Draw | Two player discards per hand. | Three player discards per hand. |
| Lucky Break | One activation per boss. | Two activations per boss. |
| Flexible Carry | One activation per boss. | Two activations per boss. |
| Read the Table | Once per boss, reveal the rank of one randomly selected committed boss card. | Once per boss, reveal ranks of two distinct randomly selected committed boss cards. |
| Last Stand | Unique passive: two extra discards per subsequent hand when the boss is one win from victory (two hand wins). | Not available; cannot stack or evolve. |
| Peek Ahead | Always show the rank of the player's actual next draw. | Always show its rank and suit. |

### Discard allowances and Last Stand

Quick Draw allowance resets at each new hand, including after a bilateral refresh. Last Stand activates only at the next-hand boundary when the boss is one win from victory (two hand wins); it never changes the completed hand retroactively. It adds two to the base/Quick Draw allowance: totals are 3, 4 or 5. It remains active through ties while the boss remains one win from victory, does not accumulate, ends with the encounter and starts inactive at a new boss. Flexible Carry confirmation uses the same next-hand boundary. Boss allowances are unchanged. The trigger is relative to `rules.winsRequired - 1`; the first boss hand win does not activate it.

### Lucky Break

Before showdown, select exactly one held card and activate. Spend one normal discard and one ability use; put the original card out and draw the next two cards into a required choice. Confirm one to restore the five-card hand; the other goes out. Both candidates are consumed from the draw pile and count toward card accounting while pending.

Activation requires one available normal discard, one ability use and at least two draw cards. Invalid attempts consume nothing. Ordinary discarding and showdown are blocked during the choice. Resolve it before returning to normal selection; the original selection clears. Level 2 grants two separate activations, not an additional choice within one activation.

### Flexible Carry

After a non-final showdown, optionally retain two and draw four, temporarily holding six. Choose and confirm any one card for the out pile; the remaining five begin the next hand. Declining performs the normal refill. No normal discard or Lucky Break use is spent.

It is unavailable after an encounter ends or during reward/progression screens. Activation requires four player draw cards and enough cards for both sides to refill normally. A required bilateral refresh takes precedence. Showdown cannot begin until the six-card choice is resolved.

### Read the Table

The boss's actual three-card decision must already be committed. Reveal ranks only, never suits, from one or two distinct committed cards. **Distinct cards may share a rank.** Level 2 increases cards revealed, not activations: there is one activation per boss at either level, with no discard cost.

Hints appear at the correct positions among the five boss card backs and remain until showdown, including through player discards and Lucky Break. Other backs do not identify which cards were committed. New hands/refreshes clear the hints and commitment without restoring the encounter use. The boss cannot discard again, change its decision or submit a different committed trio.

### Peek Ahead and reset boundaries

Peek Ahead reads only the first card of the player's actual draw pile. It spends nothing, makes no random calls and never reorders draws. Level 1 reveals no suit through colour, symbols or accessible text. The compact pile indicator shows an ordinary back without ownership and an empty state without stale information when exhausted. It updates during draws, pending Lucky Break and Flexible Carry choices, refills, refreshes and new encounters.

Lucky Break, Flexible Carry and Read the Table uses persist between hands and through deck refreshes; they reset only with a new boss. All owned levels persist through the run. New Run resets collection and encounter state. Intro screens do not create a deck or reveal an undetermined next draw.

## Current screen flow

| Trigger | Presentation and continuation |
|---|---|
| Take a seat, New Run or Try again | Drifter introduction → Face the Boss → gameplay. |
| Starting any later encounter | Upcoming poster, existing subtitle and compact progress → Face the Boss. |
| Ordinary hand win/loss/tie | Brief HAND WON / HAND LOST / DEAD HEAT overlay → persistent showdown → Next hand, or optional Flexible Carry. |
| Victory over bosses 1-4 | Boss Defeated → Choose Upgrade → select and claim → next introduction. |
| Encounter loss | Run Over → Run Summary → existing summary / Try again flow. |
| Fifth boss victory | Immediately Run Complete, without a prior Boss Defeated screen or reward offer. |
| Endless Mode from Run Complete | Generate deferred fifth reward if eligible → claim → first Endless introduction. If the pool is empty, go directly to that introduction. |
| Later Endless victories | Boss Defeated → reward/continuation → next Endless introduction. With no eligible upgrades, Continue skips reward selection. |

Introductions remain until Face the Boss is pressed. Only then are decks created and the boss decision committed. Gameplay actions are blocked during introductions and mandatory ability choices. Endless progress uses labels such as ENDLESS · ENCOUNTER 6, never 06 / 05. Phase guards prevent duplicate reward claiming or repeated progression.

## Artwork, presentation and accessibility conventions

- Boss wanted posters are PNGs in `assets/images/bosses/`, selected from existing boss identity. Illustrated upgrade PNGs are in `assets/images/upgrades/`; preserve their exact filenames and metadata in `upgrades.js`.
- Do not modify supplied images. Preserve aspect ratios, show the whole image without cropping, and reserve image space while loading. Boss failures reveal a text name; upgrade failures reveal a readable definition-based text card. Accessible names/descriptions identify bosses and offered upgrade levels/effects.
- The reward screen intentionally contains only navigation, centred Claim your reward, illustrations and Claim Upgrade. Visible level badges and extra effect captions are removed; offered levels/effects remain accessible. Cards stack on mobile and scale to available viewport height, with natural scrolling on unusually small screens rather than clipping.
- Artwork may contain base-level wording such as "X1 per round." It does not override per-boss use limits or improved-level effects defined by code. The Upgrades dialog provides current owned levels and descriptions.
- Ordinary overlays last about 1.4 seconds, announce the result accessibly and dismiss immediately on tap/click, Enter, Space or Escape. They block underlying actions temporarily, restore focus and never advance the hand. They do not appear on encounter-ending hands.
- Persistent ordinary results are Hand Won (green), Hand Lost (red) and Dead Heat (gold), with accurate hand names separated by a smaller "vs" and no trailing comparison full stop. Chips show encounter scores; the internal hand count continues in history without a header indicator.
- Boss Defeated is a dedicated poster-led screen with no separate duplicate boss-name caption. Two decorative red SVG brushstrokes paint an X over the poster; the image file is untouched. The X stays, has no pointer interaction and appears fully drawn with reduced motion. It is absent from introductions, Run Over and Run Complete.
- Run Over has a red heading, Defeated by [boss] and Run Summary. Run Complete has its own celebratory treatment and Endless Mode / New Run choices. Neither automatically advances.
- Intro and milestone entrance animations are short, respect reduced motion and never delay buttons. Preserve sensible keyboard focus and immediately usable controls.
- How to Play is an accessible, internally scrollable dialog with gold section headings, valid miniature Three Card Poker examples, boss progression and upgrade explanations. Preserve Escape closing and focus management; the Upgrades collection dialog follows the same accessibility conventions.
- Home shows the title, existing gold tagline beneath it, decorative playing cards and Take a seat. A home-specific CSS rule hides its footer without changing footer behaviour elsewhere; navigation remains available.

## Simulation strategy assumptions

Greedy chooses the strongest available triple; random selects a legal triple uniformly. Conservation scores current win equity plus 0.65 times expected next-hand equity from the retained pair, using a fresh-deck future estimate that does not fully model depletion. When both sides are one win from victory (currently 2-2), it uses greedy selection. The weight was chosen before the historical results.

Informed discarding averages possible draws from the unordered remaining card pool and discards only when expected strategy score improves. It does not know the next draw or opponent's hand. Equity uses the exact distribution of the strongest triple from a fresh random five-card hand. These are heuristic strategies, not optimal play. The preserved baseline measured the earlier 24-card, first-to-two game, with greedy final-hand selection at 1-1 and no upgrade effects. It is not a measurement of the approved format or current human difficulty; see PROJECT_STATUS.md.

## Deferred features and boundaries

Shops, currency, permanent unlocks/progression, save/resume, accounts, a backend and multiplayer are not implemented or approved by this milestone. New features or changes to balance, rules and progression require discussion. No additional upgrade set or difficulty tiers are implied by this document.
