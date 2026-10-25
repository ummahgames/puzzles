'use strict';
const { Engine, C } = require('../core.js');
const seeds = Number(process.argv.find(a => a.startsWith('--seeds='))?.split('=')[1] || 100);
const turns = Number(process.argv.find(a => a.startsWith('--turns='))?.split('=')[1] || 100);
let volleys = 0, recalls = 0, maximumBlocks = 0, maximumPhotons = 0;
const lossWaves = [], start = performance.now();
for (let seed = 0; seed < seeds; seed++) {
  const engine = new Engine({ mode: 'survival', seed: 'stress-' + seed }); engine.emit = () => {};
  for (let turn = 0; turn < turns && engine.phase !== 'result'; turn++) {
    if (engine.phase === 'upgrade') engine.choose(engine.offers.includes('power') ? 'power' : engine.offers[0]);
    engine.setAngle(-Math.PI + Math.PI / 12 + ((seed * 17 + turn * 31) % 101) / 100 * (Math.PI - Math.PI / 6));
    engine.fire(); volleys++;
    let steps = 0;
    while (['flight', 'settle'].includes(engine.phase) && steps++ < 2300) {
      engine.step(); maximumBlocks = Math.max(maximumBlocks, engine.blocks.length); maximumPhotons = Math.max(maximumPhotons, engine.photons.length);
      for (const p of engine.photons) if (p.active && (!Number.isFinite(p.x + p.y + p.vx + p.vy) || p.x < p.r - 0.01 || p.x > C.W - p.r + 0.01 || p.y < p.r - 0.01)) throw new Error('Photon escaped bounds or became nonfinite.');
    }
    if (steps >= 2300) throw new Error('Volley did not terminate.');
    if (engine.snapshot()) Engine.restore(engine.snapshot());
  }
  recalls += engine.stats.recalls;
  if (engine.phase === 'result') lossWaves.push(engine.wave);
}
lossWaves.sort((a, b) => a - b);
console.log(JSON.stringify({ seeds, turns, volleys, recalls, maximumBlocks, maximumPhotons, lostRuns: lossWaves.length, medianLossWave: lossWaves.length ? lossWaves[Math.floor(lossWaves.length / 2)] : null, minimumLossWave: lossWaves[0] || null, maximumLossWave: lossWaves.at(-1) || null, elapsedMs: Math.round(performance.now() - start) }, null, 2));
