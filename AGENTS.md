# Working on Dead Man's Hand

## Scope and ownership

- Preserve the Western visual direction and buildless HTML/CSS/JavaScript setup. No dependency installation is needed for the existing project.
- Core responsibilities: `engine.js` contains shared poker rules, AI and gameplay effects; `upgrades.js` contains upgrade definitions, levels, eligibility and artwork metadata; `app.js` handles browser presentation, interaction and run transitions. The browser and simulation share the engine.
- Read only documentation relevant to the task. Verify implementation where documentation may be stale; do not reread every document for each small follow-up.
- The six upgrades, rewards, boss introductions and milestone screens are approved, implemented features. Discuss new major gameplay, balance, architecture or progression changes before implementing them. Shops, currency and permanent unlocks remain deferred.
- The approved encounter format is independent 28-card decks (8 through Ace), first to three wins and three chips per side. Preserve the central `engine.js` `rules` configuration; Last Stand triggers at the next-hand boundary when the boss reaches `rules.winsRequired - 1` wins.
- Never give bosses hidden player-card or future-draw knowledge. Preserve committed boss decisions and information boundaries.
- Preserve supplied artwork, aspect ratios, accessible fallbacks, reduced motion and immediately usable transition buttons. Artwork text does not define upgrade effects.
- Do not add frameworks, backends or dependencies without a clear need discussed with the user. Do not invent a license. Do not commit, push, deploy, publish or enable hosting without explicit authorisation.

## Proportionate checks

- Use the smallest checks appropriate to the change. Documentation changes normally need only a consistency review; small visual changes need focused visual checks; gameplay changes need relevant engine and regression tests. Check affected interactions where necessary.
- Reuse passing results when relevant code is unchanged. Repeat checks only for a specific change, failure or unresolved concern.
- Run broader regression checks at the end of substantial features or development sessions, with scope matched to the work. Do not run the full suite after every small change.
- Avoid exhaustive browser audits, unnecessary simulations, repeated analysis and unrelated cleanup. Never claim a check passed unless it was executed; distinguish historical results from current checks.
- Once the requested work and appropriate checks pass, report the outcome and limitations, then stop.

## Commands and baseline

- `npm start` serves http://127.0.0.1:4173 on loopback only. Use `npm.cmd` in Windows PowerShell if `npm.ps1` is blocked; no execution-policy change is needed.
- `npm test` runs the full suite. For focused cases, use `node --test tests/<file>.test.cjs` or `node --test --test-name-pattern="<pattern>" tests/app.test.cjs`. See `docs/PROJECT_STATUS.md` for introduction-fixture conventions.
- `npm run simulate -- 5000` runs seeded strategy comparisons and overwrites `simulation-results.json`. Run simulations only for a defined, authorised balance investigation. Preserve the historical baseline unless intentionally updating it, and document methodology and limitations for new results.
