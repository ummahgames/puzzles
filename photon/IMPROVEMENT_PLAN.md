# Photon Breaker improvement plan

Photon should become a readable, satisfying ricochet game with short authored stages, deliberate upgrade choices, and an endless survival mode. Preserve the single aim and volley interaction, the moving launch position, and the pleasure of clearing a pocket of blocks. Build depth through board geometry and decisions rather than ever larger health numbers or longer waits.

All gameplay, progression, saves, sound, and content must run in the browser. Keep static HTML, CSS, JavaScript, and local assets, with no accounts, backend, remote APIs, CDN dependencies, or required network connection after the files are available. Preserve opening `index.html` directly. Development and automated verification can use local command-line tools.

This is an implementation proposal grounded in the current code. Runtime defects below were reproduced through Node with DOM and canvas stubs; design and balance targets are starting values to validate through later playtesting. No browser or web interface was accessed. Baseline: commit `2aa4c0c`.

## Current game and priorities

The game has a useful foundation: a 360 by 640 virtual canvas, an eight-column board, sequential photon launches, a fixed physics step, immediate pickup collection, synthesized audio, and a compact static distribution. The main implementation is 981 lines in `game.js`; `index.html` contains only the canvas and two buttons.

Today, “level” means one new descending row after every volley. Every row uses independent random occupancy, health grows with the row number, and upgrades come from weighted random pickups. There are no completed stages, authored lessons, save system, pause state, keyboard controls, or selectable modes. The starting loadout has one photon. These rules risk making early play slow and late difficulty depend heavily on which permanent upgrades happen to drop; that balance inference needs simulation and playtesting.

Implementation priority:

1. Make every shot and reward trustworthy.
2. Make aiming, waiting, board descent, and failure easy to understand.
3. Prove six excellent stages and a coherent visual language.
4. Add progression, build choices, and a fair survival generator.
5. Expand content after the six-stage prototype meets its playability targets.

## Confirmed defects and required fixes

References identify baseline functions and line numbers; line numbers will change during implementation.

| Priority | Finding and evidence | Required change and acceptance condition |
| --- | --- | --- |
| P0 | `startFiring`, `spawnPhoton`, `collectPowerUp`, and `loop` share `nextBuffs` (`game.js:332`, `345`, `456`, `938`). Collecting Big Ball during firing produced a radius of 9 in the current volley, then `nextBuffs.big` became false when the queue drained. | Snapshot the entire volley before launching anything. Clear pending effects immediately after snapshotting. Every pickup collected afterward belongs to the next volley. All photons in one volley use identical loadout values. |
| P0 | `resolveBlockCollisions` consumes pierce without moving beyond the contact or remembering it (`game.js:441`). Two overlap checks against one block reduced HP from 10 to 8 and used both pierce charges. | Assign stable block IDs and track contacts until exit. Charge and damage once per entry; allow a legitimate later re-entry. A piercing photon must traverse two distinct blocks to spend two charges. |
| P0 | A photon inside a block yields `dx = dy = 0` and a zero normal (`game.js:416`, `445`). A photon at `(20,70)` inside the first block retained both its position and upward velocity after collision. | Resolve initial penetration using the nearest valid face, with deterministic tie-breaking; reflect only when moving into a surface. Never return a zero normal. |
| P0 | Physics checks only the endpoint after movement (`game.js:368`). At 6,000 pixels per second, one 1/120-second step moved a photon from y=95 to y=45 through a block without damage. Speed upgrades and level speed scaling are unbounded. | Use continuous collision detection and process remaining travel after impact. Cap physical speed independently of progression. High speed and accelerated simulation must preserve hits. The reproduced speed is a stress case, not a measurement of ordinary early play. |
| P1 | `MAX_PHOTONS` caps the array at 60 while `ballCount` grows indefinitely (`game.js:23`, `346`, `464`). A count of 61 spawned only 60 photons, and the launch queue still spends time on skipped spawns. | Use one effective count for the HUD, queue, and spawn logic. Cap inventory at 60 and convert overflow pickups into a documented alternate reward, initially a score bonus. |
| P1 | `updateAimFromPointer` restricts pointer height rather than shot angle (`game.js:269`). From x=5, aiming at `(359,599)` creates only 13.04 pixels per second of upward travel: about 93.14 seconds for an empty-board return. There is no volley timeout or recall. | Clamp aim to at least 15 degrees above horizontal. Add fast forward, recall, and a guaranteed end to every volley, including a photon with zero vertical velocity. |
| P1 | `trajectoryPreview` always uses radius 5 (`game.js:556`). With Big Ball, it predicted a ceiling contact at y=5 while the actual center must stop at y=9. It also uses square inflated corners while physics uses circle contacts, ignores pierce, and has no bottom return plane. | Share collision queries and shot parameters with the simulation. Stop at return. Show a reliable first contact and mark later predictions as provisional when block destruction could change the path. |
| P1 | `advanceLevel` increments level before checking loss and returns during the descent loop (`game.js:216`). A fatal descent changed level 18 to 19 and left board rows `[0,18]`, with the first block not shifted. | Calculate descent for the whole board, apply it consistently, then check the loss boundary. Track completed waves separately from the incoming wave. Results must report the wave actually played. |

Additional issues visible in the source:

- `spawnPhoton` reads permanent speed and power on each launch. Mid-volley pickups can therefore change later photons even when one-shot effects are fixed. Snapshot permanent values too.
- `startFiring` clears the laser flag after firing the beam. A laser collected by that beam can be overwritten. Snapshot and clear before resolving the beam so new pickups remain pending.
- `fireLaserBeam` counts block intersections against its 20-iteration “bounce” limit. Use separate wall bounce, distance, and safety limits so its range does not change accidentally with block density.
- `firstReturnX` is selected by reverse array iteration within a physics step, not precise arrival time. Select the earliest return event by collision time, then photon ID for ties.
- Fading blocks update only in active physics (`game.js:404`), while the aiming branch updates text and laser only (`962`). Move cosmetic updates into one phase-independent animation pass so break flashes finish after the last photon returns.
- Restart discards active photon references without returning them to the pool and leaves some input/timing globals outside `initGame`. Centralize teardown and reset timers, pointer ownership, effects, and accumulator.
- Flame is immediate `damage + 1`, although the README calls it burn damage. Keep the simple effect initially and name it Overcharge; introduce timed burning only with an explicit, tested rule.
- `resize` sets the canvas backing resolution from CSS size without device pixel ratio (`game.js:103`). Add a separate backing scale for crisp rendering while retaining input coordinates in logical units.

## Recommended game structure

Make Campaign the first option, with Survival unlocked after the opening lesson. A stage is a small sequence of incoming waves with a finite win condition: release all scheduled waves and clear the remaining destructible blocks before any block crosses the danger line. Surviving blocks descend one row after each volley, including cleanup volleys after the final spawn. Clearing a board early releases the next scheduled wave; it does not skip rewards or grant a free stage clear.

Use separate names in code and UI: `stageId`, `waveIndex`, `volleyIndex`, and `survivalWave`. Replace the current ambiguous level label with “Stage 2 · Wave 3/5” or “Survival · Wave 18.” Show the next incoming row while aiming so the player can plan for descent.

A turn follows one explicit sequence:

1. Aim and inspect the visible incoming row, danger line, and next-volley effects.
2. Lock a shot and snapshot its loadout. Launch the full volley from one position.
3. Resolve contacts, rewards, and returns; optionally fast forward or recall.
4. Gather the photons at the earliest return position. Animate the launcher moving there.
5. Commit pending upgrades and any scheduled upgrade choice.
6. Animate one complete board descent. Check failure, then either spawn the scheduled row or finish the stage when the board is empty and the schedule is exhausted.

Stage setup must reserve a known number of safe descents for cleanup. The final wave should not leave an unavoidable wall at the danger line. Loss, clear, and upgrade selection are explicit states, not side effects of spawning.

The long-term campaign target is 24 stages in four chapters. Build six stages first; ship an initial 12-stage campaign only after the first six prove the loop. Chapters three and four, elaborate finales, and extra modes are expansion work.

## Aiming and pacing

Use Pointer Events with one active pointer ID and pointer capture. Retain desktop hover to aim and primary click to fire. On touch, hold and drag to aim, release to fire, with a small dead zone and a clear cancellation gesture. Pointer cancellation, releasing outside a valid aim region, or interacting with a menu must not fire. Ignore secondary mouse buttons and extra touches.

Provide a comfortable aim area in the launch band, plus an optional drag-relative mode so fingers can adjust direction without covering the target. Show the launch direction, first impact marker, and a minimum-angle boundary. Recalculate the direction from the latest input when the launch position changes; do not keep a stale vector from the previous origin.

Keyboard controls: Left/Right adjust by one degree, Shift enables finer adjustment, Space or Enter fires, Escape pauses, F toggles fast forward, and R recalls during a volley. Prevent game shortcuts while a dialog control has focus. Show a visible focus indicator and brief control hints. Keep a Fire button available for users who prefer to separate aiming from shooting.

Initial pacing values to tune:

| Parameter | Starting value | Purpose |
| --- | --- | --- |
| Starting photons | 3 | Make the first shot feel like a volley and create early clearing opportunities. |
| Base physical speed | 420 logical pixels per second | Retain a known baseline while repairing collision behavior. |
| Launch interval | `min(65 ms, 1500 ms / effectivePhotonCount)` | Keep the launch train at or below 1.5 seconds even near the 60-photon cap. |
| Minimum elevation | 15 degrees above horizontal | Prevent excessively slow legal opening shots. |
| Fast forward | 2 times simulation rate | Shorten waiting without increasing physical velocity. Process additional fixed steps. |
| Recall availability | After 4 seconds of simulated volley time | Let the player abandon an unproductive remainder. Recall causes no further damage and still spends the turn. |
| Automatic recall | At 18 seconds of simulated volley time | Guarantee completion even for trapped or horizontal photons. Show a warning before recall. |
| Gather and descent | Roughly 250 ms each | Make the transition legible without creating another long wait. |

Recall must account for photons still in the launch queue as well as those in flight. If none returned naturally, retain the old launch position. Keep the same recall policy at normal and accelerated speed and disclose it in the tutorial.

Auto-pause on document hide and window blur. Resume through an explicit control, resetting the frame clock so no hidden elapsed time becomes gameplay. A restart during a run should open a small local confirmation with Restart and Continue; disable the prompt on the results screen. Add a one-step undo in tutorial/practice mode only; keep survival scoring separate from practice assists.

## Level design and difficulty

Replace independent random cells with authored patterns for Campaign and a library of seeded pattern families for Survival. A useful pattern has a route, a payoff, and a threat: an entry channel, a pocket reachable through a bank shot, and low blocks the player must clear before exploiting the pocket.

The current row supplies about `8 × 0.65 = 5.2` blocks before the empty-row fallback, with health near the wave number. At wave 20, ordinary HP is 18–20, so a new row has roughly 94–104 HP on average before fallback. Photon count and damage depend on pickups and have no corresponding guaranteed schedule. This illustrates why balancing only by wave number cannot establish fair difficulty.

For Survival, define a baseline loadout curve from guaranteed rewards, then author each wave band against it. Do not raise HP immediately in response to a player's damage upgrade; strong choices should produce a visible advantage. Difficulty budgets should combine total HP, occupied columns, distance from the danger line, available entry routes, and block types. Estimate expected productive hits per photon from seeded simulations; use that estimate to choose HP budgets rather than assuming every photon hits once.

Generation constraints:

- Keep an accessible entry lane in early waves and avoid a solid barrier near the bottom.
- Place guaranteed rewards on reachable targets with enough time to collect them.
- Introduce one new mechanic at a time, then combine familiar mechanics.
- Alternate pressure waves with relief waves; increase density and geometry complexity gradually.
- Cap health and representation complexity within a chapter. Change layouts before adding digits to HP.
- Generate the incoming row before the player fires and display it. Use a run seed and dedicated gameplay RNG; stars and audio variation must not consume that RNG.
- Never rely on random Speed or Hint drops to rescue an otherwise unwinnable opening.

Opening six-stage prototype:

| Stage | Lesson | Board and reward design | Completion check |
| --- | --- | --- | --- |
| 1 | Aim and clear | Two short waves of low-HP blocks, generous gaps, no timed instruction overlay. Guaranteed extra photon. | A direct shot can clear meaningful space; explain descent before the second wave arrives. |
| 2 | Bank shot | A pocket accessible through a wide wall route; mark the first bank in the tutorial. | Players see why a wall bounce can outperform a direct shot. |
| 3 | Launch position | Two safe lanes and one low threat; highlight the first returned photon. | Explain where the next shot begins before the descent. |
| 4 | Upgrade timing | Give Overcharge through a reachable block before a dense follow-up wave. | All photons receive it on the next volley, with a visible before/after difference. |
| 5 | Chain clear | Place an explosive block among fragile neighbors behind a generous entry gap. | The chain reaction is readable and cannot recursively apply twice. |
| 6 | Combined challenge | A short sequence mixing pockets, low threats, and one upgrade choice. | Win and loss screens explain the result; retry reproduces the layout. |

Long-term chapters:

| Chapter | Stages | Identity | Mechanical progression |
| --- | --- | --- | --- |
| Dawn | 1–6 | Dark blue space, ivory photons, cyan glass | Direct aim, banks, launcher position, pickups, then explosive blocks. |
| Prism | 7–12 | Teal surfaces and violet optics | Fixed diagonal reflector rails and routes that redirect photons into pockets. |
| Eclipse | 13–18 | Indigo and amber shielding | Shielded blocks take reduced damage on the marked face, with clearly taught side access. |
| Nova | 19–24 | Warm cores against deep navy | Combine earlier mechanics in authored finale boards with explicit clear objectives. |

Use a few types with distinct behavior: ordinary blocks, explosive blocks, fixed reflector rails, and shielded blocks. Reflector rails are nondestructible and do not count toward the clear condition. Mark their collision geometry visibly. Teach each interaction in an isolated safe layout. Moving blocks, portals, splitting projectiles, and elaborate bosses stay outside the initial scope because each multiplies collision and preview complexity.

## Rewards and meaningful builds

Separate three lifetimes: campaign unlocks saved between sessions, run upgrades lasting through the current survival run or campaign stage, and consumables affecting the next volley. Campaign stages begin with authored baseline loadouts, making difficulty reproducible. Between stages, carry unlocked content and cosmetics rather than unlimited stat growth. Survival retains run upgrades until loss.

Guarantee the first extra photon and establish regular growth milestones, initially at least one extra photon opportunity every two survival waves. Use pickups primarily for immediate delight; use milestone choices for deliberate build direction. After every five survival waves, offer three distinct valid upgrades and show exact effects before selection. Define eligibility and caps so maxed upgrades never appear as wasted choices.

| Existing reward | Proposed role | Rule |
| --- | --- | --- |
| +1 Ball | Reliable run growth | Add one photon next volley, cap at 60, convert overflow into a displayed score bonus. |
| Power | Run damage choice | Add one damage per photon next volley; use a tested tier cap, initially three upgrades. |
| Speed | Pacing setting | Remove from the reward pool. Fast forward controls waiting while physical speed stays bounded. |
| Hint | Baseline aiming assistance | Give a useful preview from the start. A longer preview can be an optional assist setting. |
| Big Ball | Next-volley tactical effect | Radius becomes 9 for the whole next volley; preview matches. Teach that some gaps become inaccessible. |
| Flame | Overcharge | Add one immediate damage for the whole next volley. Name and description match the implemented rule. |
| Pierce | Next-volley tactical effect | Pass through two distinct contacts per photon, then resume ordinary reflection. |
| Laser | Next-volley tactical effect | Fire a thin wall-reflecting beam before photons. Show its separate path and a documented bounce limit, initially four wall bounces. |

Initial choice families can focus on more photons, higher damage, or a ricochet bonus capped per photon per volley. Prototype the ricochet bonus only after baseline simulation is stable. Avoid presenting marginal numeric differences as different builds. Keep at most three build cards visible; explain dependencies and maximum values in ordinary language.

Pending consumables should appear as labeled chips with counts. A pickup acquired during a laser or volley always enters the pending inventory. Identical consumables stack to a small displayed inventory cap, initially three charges; activating a shot consumes one charge of each available effect. Combining effects is allowed, but every combination must use the same collision and damage rules as its preview. Show overflow conversion explicitly.

Campaign rewards: one star for completing the stage, a second for completing within a visible volley target, and a third for a visible authored challenge. Unlock the next stage on completion; stars are optional mastery goals. Retry uses the same layout and starting loadout. Award cosmetic photon trails and palette variants at chapter milestones. Progression should not require repeating easy stages to purchase power.

Score should reward clamped damage actually dealt, block clears, and limited chain bonuses. Do not reward repeated overlap bugs or elapsed waiting. Display the breakdown after a run; use one scoring function for photons, explosions, and lasers. Keep best results separated by mode, rules version, seed, and assist settings where appropriate.

## Art direction and interface

Give Photon an optical identity: luminous ivory particles traveling through glasslike geometric structures in a restrained space setting. Use a dark navy field, quiet stars, crisp faces, and localized light at the point of interaction. The existing renderer has eight repeating HP colors, pulsing reward outlines, multiple halos, and outlined tiny reward text; reduce competing signals and give each visual channel a specific job.

Visual roles:

- Block shape and inset icon identify behavior. Color reinforces type; it is never the only cue.
- A compact edge meter or damage cracks show remaining durability. Keep a readable HP number centered.
- Reward blocks show one large icon; the full name and effect appear when selected or collected.
- The danger line and lowest threatened row receive stronger emphasis than distant blocks.
- Photon trails communicate direction. Keep the core bright and effects short enough that dense volleys remain legible.
- Aim lines and first contact markers sit above decoration. Future incoming blocks appear as a subdued row in a dedicated preview area.

Initial palette: background `#080F21`, surfaces `#15243B`, text `#EDF5FF`, aim and ordinary energy `#70E4F2`, rewards `#FFD38A`, and danger `#FF798B`. Treat these as art tokens, not final contrast approval. Validate labels and controls against their actual backgrounds after rendering is available.

Build crisp block faces, icons, chapter motifs, and emitter art with local SVG and canvas paths. Define a consistent icon set for photon count, damage, pierce, radius, overcharge, laser, pause, speed, and recall. Use procedural gradients and cached small glow sprites for reusable effects. A static local illustration for the title screen is optional; it should not delay fixing playability.

Move menus and most HUD text into HTML: title, stage selector, settings, pause, upgrade choices, results, and buttons. Keep moving geometry in canvas. Use a bounded game shell with a status row, board, and controls; preserve board proportions at phone and desktop sizes. On wider screens, show a compact side panel for controls and loadout rather than stretching the board into a different game.

Initial screens:

1. Home with Continue, Campaign, Survival, and Settings, plus a brief visual description of the core interaction.
2. Campaign map with stage names, completion stars, and the next available stage.
3. Play with stage/wave, photons, damage, incoming row, danger line, and pending effects.
4. Pause with Continue, controls, audio/effects settings, and Restart.
5. Upgrade choice with three cards showing exact consequences.
6. Results with completed stage/wave, damage/clear breakdown, next action, and a clear retry button.

Use a short impact flash and small fragments for block breaks, a limited traveling pulse for chain reactions, and a launcher gather animation at turn end. Make screen shake optional and off by default. Reduced-motion mode disables pulsing stars, shake, long trails, and transition travel while retaining useful state changes. Never shake the aiming view.

Audio should reinforce events: quiet contact ticks, a brighter block clear, a short pickup phrase, a beam sweep, and distinct clear/loss cues. Introduce a master gain with a soft ceiling and event priorities so dense hits do not drown out a reward. Save mute and volume settings. Resume audio only after a user gesture and handle failed resume without affecting play. Music is optional later work, with a separate volume control.

## Accessibility and mobile behavior

Remove `maximum-scale=1.0` and `user-scalable=no` from the viewport. Limit `touch-action: none` to the actual interactive board rather than the whole page. Allow menu scrolling, text selection where useful, and zoom. Respect safe-area insets and use viewport-aware layout so controls remain visible around mobile browser chrome.

Give every HTML control a descriptive accessible name and visible focus. Target at least 44 by 44 CSS pixels for touch controls and 14 CSS pixels for important labels after scaling. Use icons plus labels, shape distinctions, and clear instructions so hue or sound is never required to understand a block or pickup.

Provide a concise accessible status region for stage, wave, selected direction, pending effects, pause, and results. Announce milestones rather than every collision. Canvas descriptions and keyboard control improve access but do not by themselves make spatial play fully usable with a screen reader; a complete nonvisual board interaction would be a separate feature with dedicated testing.

Offer high-contrast visuals, reduced motion, audio volume, and aim assistance as local settings. Keep the tutorial replayable and settings reachable from pause. Pause on focus loss so switching apps does not consume a turn unnoticed.

## Client side architecture

Refactor incrementally after protecting the reproduced failure cases. Use small classic scripts with a `Photon` namespace or equivalent isolated modules so direct `file://` opening remains supported. Do not introduce runtime `fetch` for content or assume an HTTP server. Store authored content in JavaScript data files loaded by `index.html`; a future optional build can generate these files from author-friendly source data.

Proposed ownership:

| File or directory | Responsibility |
| --- | --- |
| `index.html`, `style.css` | Responsive shell, semantic menus, focus, and local controls. |
| `src/config.js` | Logical geometry, limits, balance values, palette tokens, and rules version. |
| `src/core/state.js` | Explicit phase transitions, immutable shot snapshots, pending rewards, reset, and pause. |
| `src/core/physics.js` | Pure collision queries, event ordering, return plane, and penetration recovery. |
| `src/core/simulation.js` | Fixed-step volley update, damage events, effect rules, and deterministic RNG. |
| `src/content/stages.js` | Campaign layouts, incoming waves, baselines, par volleys, and challenges. |
| `src/content/patterns.js`, `upgrades.js` | Survival templates, reward cadence, and upgrade definitions. |
| `src/input.js`, `ui.js` | Pointer/keyboard interpretation, screens, tooltips, and accessible status. |
| `src/render.js`, `effects.js`, `audio.js` | Presentation consuming gameplay state and events. |
| `src/storage.js` | Validated local saves, version migrations, and import/export. |
| `tools/`, `tests/` | Node regression cases, seed simulations, and content validation. |

Keep gameplay state independent of DOM, audio, and animation. Emit events such as block hit, destroyed, collected, returned, descended, and stage cleared; presentation consumes them. This lets the same core run in a Node harness and in the browser. Introduce files as responsibilities become useful; avoid creating empty abstractions just to match the table.

Use swept circle versus rectangle face/corner collision, not only a ray against a square inflated box. Resolve the earliest hit within a fixed step, update velocity or piercing state, offset out of contact, then process remaining time. A grid broad phase narrows candidates; shared queries provide normals and hit IDs to both preview and gameplay. Define deterministic handling for simultaneous contacts and bounded iteration when multiple impacts occur in one step. If a safety limit is reached, avoid discarding travel through blocks silently.

Use a snapshot of the world for extended previews that need to model block destruction or piercing. Do not mutate live HP, consume random rewards, score points, or play sound during prediction. A geometrical preview can show the first guaranteed contact with later segments faded; an exact full-volley prediction is unnecessary and expensive.

Run launch scheduling and gameplay physics on the same fixed simulation clock. Fast forward feeds more steps; rendering reads the latest state. Keep pause, cosmetic animation, and transition animation on clearly defined clocks. Defer destruction/removal until event processing completes so explosions and simultaneous hits resolve once.

Initial content schema example:

```js
const stage = {
  id: 'dawn-01',
  chapter: 'dawn',
  title: 'First Light',
  rulesVersion: 1,
  startingLoadout: { photons: 3, damage: 1 },
  waves: [
    { cells: [
      { column: 2, type: 'normal', hp: 1 },
      { column: 3, type: 'normal', hp: 1, reward: 'photon' },
      { column: 5, type: 'normal', hp: 1 },
    ] },
    { cells: [
      { column: 1, type: 'normal', hp: 1 },
      { column: 4, type: 'normal', hp: 1 },
    ] },
  ],
  goal: { type: 'clearScheduledWaves' },
  parVolleys: 3,
  challenge: { type: 'finishWithNoRecall' },
};
```

Validate column bounds, overlapping cells, legal HP, valid effect IDs, cleanup room, and objective feasibility before loading content. Seed and save data are untrusted input; reject unreasonable counts or invalid coordinates instead of letting them enter the simulation.

## Saves and replayability

Use a namespaced, versioned local storage record for settings, campaign completion, cosmetics, and best scores. Save a run checkpoint at stable aiming or upgrade-choice boundaries, including board IDs/HP, loadout, pending effects, launch position, seed and RNG state, counters, mode, and rules version. On refresh during an active volley, restore the prior aiming checkpoint and disclose that behavior; do not attempt to serialize live audio or presentation objects.

Wrap storage reads and writes in error handling. If storage is unavailable, keep the game playable with a visible session-only save status. Validate and migrate supported old versions. Save origins differ between hosted and directly opened files, so provide JSON export/import for moving progress and an explicit reset option for local data.

Let Survival share a seed as text and replay the same seeded run. Retry Campaign uses its authored stage data. An optional later Daily mode can derive a seed locally from a UTC date and rules version; explain that scores and time are local. Online leaderboards, multiplayer, cloud sync, and server validation are outside the client-side scope.

## Performance budgets

Set initial budgets of 60 photons, roughly 160 live blocks, 150 visible particles, a bounded preview, and capped glow intensity. Cache static backgrounds and reusable glow assets; avoid new gradients, temporary arrays, and expensive canvas shadows for every particle on every frame. Profile before introducing workers or an additional renderer.

Separate CSS layout scale from backing resolution. Cap device pixel ratio initially at 2, use the canvas bounding rectangle for pointer conversion, and recompute after resize or orientation changes. Preserve gameplay geometry across layouts and resizing.

Target 60 frames per second on the chosen reference phone and desktop, with a graceful effects reduction when rendering exceeds budget. Measure both physics cost and rendering cost: 60 photons against 160 blocks at 120 physics steps per second already means about 1.15 million naive pair checks per simulated second, before fast forward. Use a grid broad phase and test accelerated volleys explicitly. The reference hardware and final effects budgets should be recorded during implementation.

Initial asset target: under 1 MB compressed for the initial game, using local vector/procedural art and synthesized sound. Ship all required files together. Browser cache and a service worker may improve hosted offline use later, but direct file play must not depend on a service worker.

## Implementation sequence and release gates

Each milestone should produce something reviewable in code. Complete the core gates before expanding content or effects.

| Milestone | Work | Gate |
| --- | --- | --- |
| 1 · Trustworthy simulation | Protect baseline cases for effect ownership, contact identity, high-speed collisions, count cap, and complete descent. Repair return ordering and bound speed and trace limits. | Relevant regressions pass; no lost pickups, repeat overlap damage, or tunneling in the tested ranges. Preview and long-shot cases remain tracked for milestone 2. |
| 2 · Playable shell | Pointer and keyboard controls, preview parity, min angle, recall, fast forward, pause, restart dialog, crisp sizing, readable danger line, and HTML HUD. | All eight baseline issues are covered by passing regressions. Every input has a cancel path; every volley terminates; normal and accelerated simulation produce equivalent outcomes; resize and pause preserve state. |
| 3 · Six-stage prototype | Stage data and validator, explicit win condition, incoming rows, opening lessons, guaranteed growth, one explosive type, results, and consistent art tokens. | All six stages have reproducible solutions at the intended loadout; a new player can explain aim, return position, and descent after the opening lessons. |
| 4 · Progression and Survival | Local saves, checkpoint recovery, mastery stars, three-way upgrade choices, patterned seed generation, fair growth cadence, scoring, settings, and export/import. | Refresh restores the documented checkpoint; seeded retries match; bad saves fail safely; capped upgrades cannot waste choices. |
| 5 · Initial release | Expand to 12 stages, introduce reflector rails, finish icons/effects/audio, audit controls and mobile layout, and profile dense volleys. | Performance, readability, and playability targets below pass on the selected devices. |
| 6 · Expansion | Chapters Eclipse and Nova, more authored challenge variants, cosmetics, and optional local Daily mode. | New types preserve collision and preview guarantees; content adds decisions beyond more HP. |

Start with `game.js` volley state and collision code, then extract the repaired pure core. Replacing the entire implementation before preserving behavior would make failures harder to localize. Keep the existing Survival loop available through the refactor until Campaign has its first passing stage.

## Verification and success criteria

The current source passes `node --check game.js`. Eight code-only baseline scenarios reproduced the defects in the table. These checks establish implementation behavior, not visual quality or player enjoyment.

Future automated coverage should target consequential rules:

- Effects collected before the first launch, between launches, after the final launch, and during a laser all apply to the correct volley. Include permanent upgrades and identical stacked consumables.
- Corner, tangent, zero-velocity, initial-overlap, high-speed, and simultaneous collisions produce finite coordinates and bounded contact counts. Test multiple radii, piercing, and reflectors.
- Earliest return chooses the same origin regardless of array ordering. Count cap, skipped queues, recall, reset, and pooling cannot lose or duplicate photons.
- Aiming preview agrees with the simulated first contact within a small defined tolerance, initially 0.5 logical pixel, and stays within the return boundary.
- Normal and accelerated fixed-step runs produce the same gameplay state for identical seeds and input logs; cosmetic randomness does not affect rewards.
- Descent applies to all blocks exactly once. Loss, clear, wave spawn, and results agree on completed versus incoming counters.
- Save reload, migrations, missing storage, malformed imports, and interrupted volleys follow the documented recovery policy.

Build a code-only balance runner using the real core. Sweep a coarse set of legal aim angles, then refine promising angles; compare a greedy clear policy, a low-threat-first policy, and random aim. Run hundreds of seeds across wave bands and collect loss wave, total pending HP, pickup availability, volley time, and blocked routes. This detects bad patterns and scaling problems; a bot clearing a stage does not prove that its solution is understandable to a person.

Initial targets, all subject to later measurement:

| Area | Target |
| --- | --- |
| Opening comprehension | Most first-time testers complete stage 1 within two attempts and can describe why blocks descend. |
| Shot feel | A typical ordinary volley resolves in 6–12 seconds; accelerated or recalled volleys reduce idle time. The automatic simulated-time limit always ends a shot. |
| Stage length | Early stages take roughly 1–3 minutes; later stages roughly 3–6 minutes. Avoid increasing length merely through HP. |
| Fairness | Opening layouts have discoverable solutions without optional random upgrades; guaranteed growth is reachable. |
| Readability | Important HP, pending rewards, incoming row, and the danger boundary remain clear at a 320 CSS-pixel viewport. |
| Performance | Sustain the selected frame target under the dense-board budget, including accelerated play, on the recorded reference devices. |
| Reliability | No reproduced P0 defects; no silent reward loss, stuck shots, or inconsistent fatal descent. |

Later device validation should include mobile Safari, Android Chrome, and desktop browsers, landscape and portrait, focus loss, touch cancellation, keyboard-only menus, zoom, reduced motion, and audio disabled. Respect the current code-only review constraint: no UI inspection is part of this planning pass, and subjective visual or playability claims require a future authorized playtest.

## First implementation batch

The first batch should repair volley ownership, pending effects, contact identity, continuous collisions, and the effective photon cap. Add regressions for the reproduced failures, then implement recall and angle limits to put a ceiling on waiting. Update the README to match effect timing and damage semantics once behavior changes. This establishes a dependable core for the art and level redesign without committing to 24 stages before the first six work well.
