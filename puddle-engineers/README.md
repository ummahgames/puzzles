# Puddle Engineers

Rotate gutters to carry a rain cloud’s water to every thirsty flowerpot.

A direct Start / How to play / Settings menu, optional difficulty, and fresh puzzles. Eight optional campaign puzzles plus repeatable generated play, undo for the 100 most recent gameplay steps, gentle retries, and portable progress codes. Open index.html directly, or host this folder unchanged on any static host. No install, build step, dependencies, tracking, accounts, or backend is required for players. All runtime assets are local.

## Generated play

Open Generated levels on the level menu, choose a positive level number and a challenge setting, then play one finite stage. Another level starts the next number only when you choose it. The same number and challenge reproduce the same board. Restart replays it; save codes preserve partial progress and the number, without changing campaign completion. Level numbers support up to 60 decimal digits. See [generated-level coverage](../../PROCEDURAL_LEVELS.md) for coverage and save-version details.

## Rules and controls

Tap or click the labeled board and action controls. Tab and Enter/Space work throughout. Movement games display arrow controls; consult Help for keyboard shortcuts.

## Display and devices

Use the full-screen icon in the header to enter or exit fullscreen. A separate exit stays visible during fullscreen play. Browsers that do not allow native fullscreen use an expanded page view while keeping their browser bars. Desktop, tablet, and phone layouts support mouse, touch, and keyboard controls; rotate the device as you prefer.

## Saving

The Save code button exports a versioned code containing completed levels, current level, and a bounded state checkpoint. The URL hash updates after actions. Paste a code into the same game to resume. No local storage is used. Codes are checksummed and validated against per-game state schemas. Older replay codes continue using their original rules.

## Development

Canonical source lives in ../../game-kit/. Run node game-kit/build.cjs from the workspace root after changing it. This copies the browser files into each independent game folder. Run node game-kit/test.cjs for all game suites, including all 360 toolkit level solutions.

## Rainworks progression (edition 2)

New games start at numbered level 1. Easy begins on a 3×3 square board; successive stages gradually add flowers and increase board dimensions up to 7×7, with rectangular variants. Medium introduces branching pipes. Easy and medium keep the rain inlet and all drain tiles fixed. Hard offers several marked boundary drains and introduces hexagons after its first three square stages. Expert uses hexagons immediately, with 60° rotations and reciprocal six-direction connections.

Every new garden is constructed as a connected network from the rain inlet to boundary drains. Branches also lead to drains. The generator records the solved orientations, scrambles only movable tiles, and replays its reference solution against the actual win rules before returning the board. Failed checks retry generation. All flowers must receive water, at least one drain must be used, and every wet opening must meet a matching pipe or an explicitly marked boundary drain. Dry spare pipes do not count as leaks.

Later hard/expert levels alternate ordinary routing, short routes (at most the displayed number of wet tiles), and long routes (at least the displayed number). These are achievable tile-count targets backed by the reference solution, not certified global shortest/longest paths.

A completion earns 100 points plus 50 per flower, 25 per collected coin, and 100 per optional gem. Water must reach a treasure's tile to collect it. Coins and gems are never required to win. Totals carry through Next, Restart, menu selections, and portable saves. The save retains the best score for each of the most recent 100 gardens, so immediate replays cannot repeatedly award the same points; accumulated totals remain after older entries leave that history. Undo restores the prior score state.

Old campaign and generated edition-1 saves retain their original boards and rules. The new generation is edition 2 so older numbered gardens remain reproducible. Canonical implementation: `game-kit/puddle-challenges.js`, `game-kit/puddle-ui.js`, and `game-kit/puddle.css`. Run `node --test game-kit/tests/puddle-challenges.test.cjs game-kit/tests/runtime.test.cjs` from the repository root for the targeted checks.
