// Run the real simulation without a browser. Evaluates legal angles for a greedy
// low-threat-first policy; solutions are evidence of feasibility, not human ease.
'use strict';
const fs = require('node:fs');
const { Engine, C } = require('../core.js');
const Content = require('../content.js');
const args = process.argv.slice(2);
const angles = Number(args.find(a => a.startsWith('--angles='))?.split('=')[1] || 23);
const selected = args.find(a => a.startsWith('--stage='));
const ids = selected ? [Number(selected.split('=')[1]) - 1] : Content.stages.map(s => s.id);
const results = [];
function choose(engine) {
  const order = ['power', 'swarm', 'bank', 'reserve', 'blast', 'capacity'];
  const id = order.find(id => engine.offers.includes(id)); engine.choose(id); return id;
}
function trial(snapshot, angle) {
  const engine = Engine.restore(snapshot); engine.emit = () => {};
  engine.setAngle(angle); engine.fire();
  for (let n = 0; n < 2300 && ['flight', 'settle'].includes(engine.phase); n++) engine.step();
  let merit = 0;
  for (const before of snapshot.blocks) if (before.type !== 'prism') {
    const after = engine.blocks.find(b => b.id === before.id && b.alive);
    const damage = before.hp - (after ? after.hp : 0);
    merit += damage * (1 + Math.pow(before.row / 7, 3));
    if (!after) merit += 4 + (before.reward === 'photon' ? 8 : before.reward ? 4 : 0);
  }
  merit += (engine.pending.nova - snapshot.pending.nova) * 3;
  merit -= (engine.stats.recalls - snapshot.stats.recalls) * 2;
  if (args.includes('--mastery') && engine.stage.challengeType === 'recall') merit -= (engine.stats.recalls - snapshot.stats.recalls) * 1000000;
  if (engine.phase === 'result') merit += engine.outcome.won ? 100000 : -100000;
  return { engine, merit };
}
for (const id of ids) {
  let engine = new Engine({ mode: 'campaign', stageId: id }); engine.emit = () => {};
  const inputs = [];
  for (let turn = 0; turn < 65 && engine.phase !== 'result'; turn++) {
    if (engine.phase === 'upgrade') { inputs.push({ upgrade: choose(engine) }); }
    const snapshot = engine.snapshot();
    let best = null, bestAngle;
    for (let i = 0; i < angles; i++) {
      const angle = -Math.PI + Math.PI / 12 + i / (angles - 1) * (Math.PI - Math.PI / 6);
      const candidate = trial(snapshot, angle);
      if (!best || candidate.merit > best.merit) { best = candidate; bestAngle = angle; }
    }
    engine = best.engine; inputs.push({ angle: bestAngle });
  }
  const row = { stage: id + 1, title: Content.stages[id].title, won: engine.outcome?.won || false, volleys: engine.volley, score: engine.score, stars: engine.outcome?.stars || 0, recalls: engine.stats.recalls, inputs };
  results.push(row); console.log(JSON.stringify({ ...row, inputs: undefined }));
}
if (args.includes('--write')) fs.writeFileSync('tests/campaign-solutions.json', JSON.stringify(results, null, 2) + '\n');
if (results.some(r => !r.won)) process.exitCode = 1;
