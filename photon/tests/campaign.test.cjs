'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Engine } = require('../core.js');
const solutions = require('./campaign-solutions.json');
for (const solution of solutions) test('campaign stage ' + solution.stage + ' has a replayable winning route', () => {
  const engine = new Engine({ stageId: solution.stage - 1 }); engine.emit = () => {};
  for (const input of solution.inputs) {
    if (input.upgrade) { assert.equal(engine.choose(input.upgrade), true); continue; }
    assert.equal(engine.phase, 'aim'); engine.setAngle(input.angle); assert.equal(engine.fire(), true);
    let steps = 0;
    while (['flight', 'settle'].includes(engine.phase) && steps++ < 2300) engine.step();
    assert.ok(steps < 2300); assert.ok(engine.blocks.length <= 164);
    if (engine.phase !== 'result') assert.doesNotThrow(() => Engine.restore(engine.snapshot()));
  }
  assert.equal(engine.outcome.won, true); assert.equal(engine.outcome.stars, 3); assert.equal(engine.volley, solution.volleys); assert.equal(engine.score, solution.score);
});
