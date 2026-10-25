# Photon

**Find your angle.** A complete, client-side ricochet game: 24 authored campaign stages, four chapters, seeded endless Survival, and a Daily constellation. Send photons through crystal gardens, make room for descending waves, and turn chain reactions into stored light.

Open **`index.html`** directly in a browser. The game also runs on any static web host. No build step, package installation, backend, accounts, remote assets, or runtime network requests are required.

## Portable progress update

The current page uses a **Save code** control and a URL fragment to carry progress. Bookmark the updated link or copy its code before closing. A pre-existing browser save can be read for migration; updated progress is kept in memory and the fragment instead of being written to localStorage. Existing JSON backup controls remain available where implemented. Lower sections describing browser storage document the original persistence implementation; the portable adapter now supplies that storage interface.

Opening the portable save dialog pauses active action play. Loading a code reloads the page and applies each game’s existing save validation. This change was checked through source, automated tests, and DOM/Canvas stubs; no new browser or physical-device validation was performed.

## Modes and progression

- **Campaign:** Dawn teaches aiming, banks, returns, and rewards. Prism adds permanent reflectors. Eclipse introduces shielded faces. Nova combines the mechanics with explosive gardens and wide cores. Later stages begin with several rows already on the board.
- **Survival:** Enter a seed to replay the same wave sequence. Every fifth wave offers three eligible run upgrades. Ordinary turns descend one row. From wave 12, every fourth incoming wave is a **solar storm**: two new rows and a two-row descent, announced in the incoming preview. Other sixth waves provide relief.
- **Daily constellation:** A Survival seed derived from the UTC date and rules version. Scores are local; there is no online leaderboard or clock enforcement.

A campaign stage ends when all scheduled waves and remaining destructible crystals are cleared. Permanent prism rails do not count toward completion. Crossing the danger line ends a run unless a Second sunrise reserve catches the threatened rows.

Campaign stages each start with an authored loadout. Survival upgrades last until the run ends. Complete a campaign stage to unlock the next. One star is awarded for completion, one for meeting its visible volley target, and one for its stated challenge. Chapter completion unlocks optional photon colors.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Move to aim; primary click on the board fires. |
| Touch or pen | Hold, drag to aim, release to fire. Release below the launch area or outside the board to cancel. |
| Left / Right | Adjust aim by one degree. Hold Shift for quarter-degree precision. |
| Space / Enter | Fire while the board has keyboard focus. The Fire button also supports ordinary keyboard activation. |
| F / Speed button | Toggle 1× and 2× simulation speed. |
| R / Recall button | Recall after four simulated seconds; the turn still advances. |
| Escape / Pause | Pause. Focus loss and switching away also pause automatically. |

Shots are constrained to at least 15 degrees above horizontal. The first returning photon sets the next launch position. The launch train lasts at most 1.5 seconds; any remaining photons automatically recall after 18 simulated seconds. Preview segments after the first contact are provisional because destruction can change subsequent routes.

Settings include volume, mute, reduced motion, high contrast, trails, trajectory assistance, relative touch aiming, and unlocked photon colors. The first three campaign stages offer one practice rewind through Pause; using it awards the completion star but requires an unassisted replay for mastery stars.

## Crystals and stored light

| Element | Behavior |
| --- | --- |
| Cyan crystal | Loses the amount of damage actually dealt. Its number is remaining HP. |
| Pink bloom | Explodes on destruction, dealing damage to nearby crystals. Chains resolve each destruction once. |
| Amber shield | Its marked top face halves incoming damage, rounded up. Other faces take full damage. |
| Violet prism rail | A permanent diagonal reflector in the launch band. It never needs to be destroyed. |
| Wide prism heart | Sends a chain reaction across the whole garden when destroyed. |
| Resonance | Every five clears within a volley stores one **Nova pulse**, adding one damage next volley. |

All photons in a volley use the same frozen loadout. Pickups collected during a shot—including its laser—are reserved for subsequent volleys. Consumables stack up to the loadout’s storage capacity; a shot consumes one available charge of each effect. Inventory overflow awards bonus score.

| Pickup | Effect |
| --- | --- |
| Photon | Permanently adds one photon starting next volley, up to 60. |
| Overcharge | Adds one damage to every photon next volley. |
| Wide beam | Increases photon radius from 5 to 9 next volley; narrow gaps may become inaccessible. |
| Phase shift | Each photon passes through its first two distinct block entries next volley. |
| Laser | A piercing beam fires before the next volley, with up to four reflected banks. |

Survival choices and longer campaign stages offer Constellation (+2 photons), Brighter light (+1 base damage, maximum 4), Bank interest (damage from banks), Bloom (stronger explosions), Second sunrise (fatal-descent protection), and Light reservoir (more consumable storage). Maxed upgrades are excluded from choices.

Score rewards actual damage, clears, pickups, and inventory overflow. Waiting and repeated overlap do not earn points.

## Local saves

Campaign stars, unlocked colors, settings, best scores, and the latest stable run checkpoint are saved with `localStorage`. Aiming and upgrade-choice states are checkpointed. Refreshing during a volley restores its beginning; live projectiles and sounds are not serialized.

If storage is blocked or full, play continues in session mode. Use **Settings → Export save** to download a JSON backup and **Import save** to restore it. Imports are size-limited and validated before replacing progress. Directly opened files and hosted copies may use different storage origins; export/import transfers progress between them. Reset and import each have an explicit in-game confirmation.

## Code organization

| File | Responsibility |
| --- | --- |
| `index.html`, `style.css`, `icon.svg` | Responsive shell, campaign map, semantic controls, and local vector artwork. |
| `content.js` | Chapter identities, 24 explicit stage patterns, reward descriptions, and upgrade rules. |
| `core.js` | Pure deterministic simulation, swept circle/rectangle and circle/rail collisions, contact identity, damage, waves, choices, scoring, and checkpoint validation. |
| `storage.js` | Versioned profile validation, local persistence, safe import/export, and cosmetic eligibility. |
| `render.js` | Canvas presentation, incoming rows, effects, cached glows, and device-pixel-ratio sizing. |
| `game.js` | Browser input, menus, synthesized audio, accessible status, and the fixed-step frame scheduler. |
| `tests/` | Core regressions, saved campaign solutions, and shell tests using DOM/canvas stubs. |
| `tools/` | Code-only campaign solver, Survival stress runner, and dense-board benchmark. |

The simulation runs at 120 fixed steps per simulated second. Fast forward processes more identical steps rather than increasing projectile speed. A spatial grid narrows collision candidates. Gameplay RNG is separate from presentation; prediction never mutates live state or consumes rewards. Classic scripts preserve direct file opening without module-loader or fetch restrictions.

## Code-only verification

Node.js is needed for development checks only:

```sh
node --test tests/*.test.cjs
node tools/balance.cjs --angles=91 --mastery
node tools/stress.cjs --seeds=100 --turns=150
node tools/benchmark.cjs
```

The campaign solver evaluates legal shot angles through the actual simulation. `--write` refreshes `tests/campaign-solutions.json`; `--stage=13` checks an individual stage. The stored routes prove completion and three-star feasibility for every stage, without practice rewinds. They do not establish human difficulty or visual quality.

The shell harness loads the real browser scripts against small DOM/canvas stubs and exercises event handling, modal flows, results, settings, checkpoints, and import recovery. It does not open a browser, render CSS, or automate a web interface.

Browser testing is intentionally left to the user. Useful checks are phone portrait/landscape sizing, touch aim/cancel, keyboard focus in dialogs, audio on a real user gesture, high-DPI rendering, reduced motion, and refresh during a volley. Frame rate and subjective balance should be checked on the intended devices.

See [the original improvement plan](IMPROVEMENT_PLAN.md) for the baseline audit and design rationale. The README describes the implemented rules; the plan retains its original proposals and provisional targets.
