'use strict';
const { Engine, C } = require('../core.js');
const engine = new Engine({ mode: 'survival', seed: 'dense-board' });
engine.blocks = []; engine.emit = () => {};
for (let row = 0; row < 17; row++) for (let column = 0; column < 8; column++) if (column !== row % 8)
  engine.blocks.push(engine.makeBlock({ column, type: row % 4 === 0 ? 'shield' : 'normal', hp: 96 }, row));
engine.rebuildGrid(); engine.loadout.photons = 60; engine.loadout.damage = 4;
engine.pending.big = 1; engine.pending.pierce = 1; engine.setAngle(-2.1); engine.fire();
const samples = [];
for (let i = 0; i < 1200 && engine.phase === 'flight'; i++) { const start = performance.now(); engine.step(); samples.push(performance.now() - start); }
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ initialBlocks: 119, photons: 60, steps: samples.length, averagePhysicsStepMs: samples.reduce((a, b) => a + b, 0) / samples.length, p95PhysicsStepMs: samples[Math.floor(samples.length * 0.95)], remainingTargets: engine.blocks.filter(b => b.alive).length, platform: process.platform, architecture: process.arch, note: 'Node CPU simulation only. Browser rendering and device frame rate are unmeasured.' }, null, 2));
