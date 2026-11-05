# Working on Dead Man's Hand

- Preserve the existing Western visual direction and buildless HTML/CSS/JavaScript setup.
- `engine.js` is shared by the browser and simulation. Keep rules and AI logic there; `app.js` handles browser presentation and run transitions.
- Read `docs/GAME_DESIGN.md` and `docs/PROJECT_STATUS.md` before changes. Work in small, reviewed steps and run `npm test` after code changes (`npm.cmd test` in Windows PowerShell if scripts are blocked).
- `npm start` serves the game at http://127.0.0.1:4173. Check relevant browser interactions when changing UI.
- `npm run simulate -- 5000` runs seeded strategy comparisons and overwrites `simulation-results.json`. Preserve the historical baseline unless intentionally updating it; document methodology and limitations with new results.
- Discuss major rule, balance, architecture and progression changes with the user before implementation. Shops, rewards, upgrades, currency and persistent unlocks are future ideas, not approved mechanics.
- Add frameworks, backends or dependencies only with a clear need discussed with the user. Never give bosses hidden-card or future-draw knowledge.
- Do not invent a license. Do not push, deploy, publish or enable hosting unless explicitly requested. The setup handoff reserves the initial push for the user.
