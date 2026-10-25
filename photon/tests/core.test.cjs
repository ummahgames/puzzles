'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Engine, C, aimAngle, sweepBox, sweepRail, validateSnapshot } = require('../core.js');
const Content = require('../content.js');
const Storage = require('../storage.js');
function empty() { const e = new Engine(); e.blocks = []; e.rebuildGrid(); e.drainEvents(); return e; }
function block(e, cell = {}, row = 0) { const b = e.makeBlock({ column: 2, hp: 10, type: 'normal', ...cell }, row); e.blocks.push(b); e.rebuildGrid(); return b; }
function finish(e) { let n = 0; while (['flight', 'settle'].includes(e.phase) && n++ < 2300) { e.step(); e.drainEvents(); } assert.ok(n < 2300, 'volley always ends'); return e; }
function photon(e, values = {}) { return { id: 0, x: 110, y: 95, vx: 0, vy: -420, r: 5, pierce: 0, banks: 0, active: true, contacts: new Set(), trail: [], ...values }; }

test('all 24 authored stages have legal nonoverlapping waves', () => { assert.equal(Content.validate(), true); assert.equal(Content.stages.length, 24); assert.equal(new Set(Content.stages.map(s => s.title)).size, 24); });
test('next-volley pickups never leak into the current shot or disappear at queue completion', () => {
  const e = empty(); e.fire(); const snapshot = e.shot;
  e.collect('big', 100, 100); e.collect('overcharge', 100, 100); e.collect('pierce', 100, 100); e.collect('photon', 100, 100);
  for (let i = 0; i < 30; i++) e.step();
  assert.equal(e.shot, snapshot); assert.equal(snapshot.radius, 5); assert.equal(snapshot.damage, 1);
  assert.ok(e.photons.every(p => p.r === 5 && p.pierce === 0)); assert.equal(e.pending.big, 1);
  finish(e); assert.equal(e.pending.big, 1); assert.equal(e.loadout.photons, 4);
  e.fire(); assert.equal(e.shot.radius, 9); assert.equal(e.shot.damage, 2); assert.equal(e.shot.pierce, 2); assert.equal(e.pending.big, 0);
});
test('stacked consumables use one charge each; overflow turns into score', () => {
  const e = empty(); for (let n = 0; n < 4; n++) e.collect('laser', 0, 0);
  assert.equal(e.pending.laser, 3); assert.equal(e.score, 65); e.fire(); assert.equal(e.pending.laser, 2);
});
test('laser-collected laser stays available for the next volley', () => {
  const e = empty(); block(e, { column: 3, hp: 1, reward: 'laser' }); e.launchX = 160; e.pending.laser = 1;
  e.fire(); assert.equal(e.pending.laser, 1); assert.equal(e.blocks[0].alive, false);
});
test('piercing damages a block once while inside it, then can damage it on genuine reentry', () => {
  const e = empty(), b = block(e); e.fire();
  const p = photon(e, { x: b.x + 15, y: b.y + b.h + 4, pierce: 2 });
  e.movePhoton(p, C.DT, 0); e.movePhoton(p, C.DT, C.DT);
  assert.equal(b.hp, 9); assert.equal(p.pierce, 1);
  for (let n = 0; n < 12; n++) e.movePhoton(p, C.DT, n * C.DT);
  p.vy = 420;
  for (let n = 0; n < 8; n++) e.movePhoton(p, C.DT, n * C.DT);
  assert.equal(b.hp, 8); assert.equal(p.pierce, 0);
});
test('an initial overlap separates the photon with a finite nonzero normal', () => {
  const e = empty(), b = block(e); e.fire(); const p = photon(e, { x: b.x + 15, y: b.y + 5 });
  const hit = sweepBox(p.x, p.y, p.vx, p.vy, p.r, b, C.DT);
  assert.equal(Math.hypot(hit.nx, hit.ny), 1); e.movePhoton(p, C.DT, 0);
  assert.ok(p.y < b.y - p.r); assert.equal(b.hp, 9); assert.ok(Number.isFinite(p.vy));
});
test('continuous collision catches a block crossed at 6000 pixels per second', () => {
  const e = empty(), b = block(e); e.fire(); const p = photon(e, { vy: -6000 });
  e.movePhoton(p, C.DT, 0); assert.equal(b.hp, 9); assert.ok(p.vy > 0);
});
test('circle corners are rounded rather than the corners of an inflated square', () => {
  const b = { x: 50, y: 50, w: 40, h: 24 };
  assert.equal(sweepBox(44, 44, 1, 0, 5, b, 1), null);
  const hit = sweepBox(35, 46, 100, 0, 5, b, 1);
  assert.ok(hit); assert.ok(Math.abs(hit.nx + 0.6) < 0.0001); assert.ok(Math.abs(hit.ny + 0.8) < 0.0001);
});
test('effective photon count caps HUD parameters, inventory, and launch queue together', () => {
  const e = empty(); e.loadout.photons = 60; e.collect('photon', 0, 0); assert.equal(e.shotParameters().photons, 60);
  e.fire(); for (let i = 0; i < 190; i++) e.step();
  assert.equal(e.shot.photons, 60); assert.equal(e.photons.length, 60); assert.equal(e.pending.photon, 0); assert.equal(e.loadout.photons, 60);
});
test('aim minimum angle bounds the formerly 93-second shot', () => {
  const angle = aimAngle(359, 599, 5); assert.ok(-Math.sin(angle) * C.SPEED >= C.SPEED * Math.sin(Math.PI / 12) - 0.0001);
});
test('big photon preview matches the actual ceiling and safe launch origin', () => {
  const e = empty(); e.pending.big = 1; e.launchX = 5;
  const points = e.preview(5); assert.equal(points[0].x, 9); assert.equal(points[1].y, 9);
  assert.equal(points.at(-1).kind, 'return'); assert.ok(points.every(p => p.y <= C.LAUNCH));
  e.fire(); e.step(); assert.equal(e.launchX, 9); assert.equal(e.photons[0].r, 9);
});
test('automatic recall ends even a horizontal photon and manual recall waits four seconds', () => {
  const e = empty(); e.fire(); e.step(); assert.equal(e.recall(), false);
  e.photons[0].vy = 0; e.photons[0].vx = 420; finish(e); assert.equal(e.stats.recalls, 1);
});
test('earliest physical return wins irrespective of array order', () => {
  const e = empty(); e.fire();
  const late = photon(e, { id: 0, x: 80, y: 609, vx: 0, vy: 200 });
  const early = photon(e, { id: 1, x: 200, y: 609, vx: 0, vy: 400 });
  e.movePhoton(late, C.DT, 0); e.movePhoton(early, C.DT, 0); assert.equal(e.firstReturn.x, 200);
});
test('fatal descent moves the complete board and reports the played wave', () => {
  const e = empty(), upper = block(e, { column: 0 }, 0), lower = block(e, { column: 1 }, 17);
  const wave = e.wave; e.returnTarget = 180; e.advance();
  assert.equal(e.phase, 'result'); assert.equal(upper.row, 1); assert.equal(lower.row, 18); assert.equal(e.wave, wave); assert.equal(e.outcome.wave, wave);
});
test('second sunrise removes the fatal row once without granting damage score', () => {
  const e = empty(); block(e, { column: 0 }, 17); e.loadout.reserve = 1; e.returnTarget = 180; e.advance();
  assert.notEqual(e.phase, 'result'); assert.equal(e.loadout.reserve, 0); assert.equal(e.score, 0); assert.ok(e.blocks.every(b => b.y + b.h < C.DANGER));
});
test('explosions and Nova count each destroyed block exactly once', () => {
  const e = empty(); for (let column = 0; column < 6; column++) block(e, { column, hp: 1, type: 'bomb' });
  e.fire(); e.damageBlock(e.blocks[0], 1); assert.equal(e.stats.clears, 6); assert.equal(e.pending.nova, 1); assert.equal(e.score, 36);
  assert.equal(e.drainEvents().filter(event => event.type === 'break').length, 6);
});
test('shield top resists damage, side damage is unchanged', () => {
  const e = empty(), b = block(e, { type: 'shield' });
  e.damageBlock(b, 4, { nx: 0, ny: -1 }); assert.equal(b.hp, 8);
  e.damageBlock(b, 4, { nx: 1, ny: 0 }); assert.equal(b.hp, 4);
});
test('prism rail reflects a photon without taking damage', () => {
  const e = empty(), b = block(e, { type: 'prism' }, 4); e.fire();
  const p = photon(e, { x: b.x + b.w / 2, y: b.y + 60 });
  const hit = sweepRail(p.x, p.y, p.vx, p.vy, p.r, b, 1); assert.ok(hit);
  e.movePhoton(p, 0.15, 0); assert.equal(b.hp, 10); assert.ok(Math.abs(p.vx) > 100);
});
test('campaign clear ignores permanent rails', () => {
  const e = empty(); block(e, { type: 'prism' }, 4); e.incoming = []; e.wave = e.stage.waves.length; e.returnTarget = 180; e.advance();
  assert.equal(e.phase, 'result'); assert.equal(e.outcome.won, true);
});
test('checkpoint round trip preserves future waves and replay behavior', () => {
  const a = new Engine({ mode: 'survival', seed: 'same-sky' });
  const b = Engine.restore(a.snapshot()); a.emit = () => {}; b.emit = () => {};
  a.setAngle(-1.2); b.setAngle(-1.2); a.fire(); b.fire();
  for (let n = 0; n < 2400; n++) { a.step(); b.step(); }
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test('normal and accelerated fixed-step schedules produce identical gameplay', () => {
  const a = new Engine({ mode: 'survival', seed: 'time-is-light' }), b = Engine.restore(a.snapshot());
  a.emit = b.emit = () => {}; a.fire(); b.fire();
  for (let n = 0; n < 1800; n++) a.step();
  for (let n = 0; n < 900; n++) { b.step(); b.step(); }
  assert.deepEqual(a.snapshot(), b.snapshot()); assert.equal(a.score, b.score);
});
test('upgrades are eligible, distinct, capped and checkpointable', () => {
  const e = new Engine({ mode: 'survival', seed: 'upgrades' });
  e.loadout.photons = 60; e.loadout.damage = 4; e.loadout.bank = 3; e.loadout.blast = 3; e.loadout.reserve = 2;
  e.offers = e.makeOffers(); e.phase = 'upgrade'; assert.deepEqual(e.offers, ['capacity']);
  assert.equal(validateSnapshot(e.snapshot()), true); assert.equal(e.choose('power'), false); assert.equal(e.choose('capacity'), true); assert.equal(e.loadout.capacity, 4);
});
test('malformed checkpoints cannot inject invalid geometry, counts or duplicate IDs', () => {
  const original = new Engine().snapshot();
  for (const mutate of [s => s.loadout.photons = 100000, s => s.blocks[0].x = NaN, s => s.blocks[0].w = 1000, s => s.blocks.push(s.blocks[0]), s => s.phase = 'flight', s => s.offers = ['unknown'], s => s.incoming[0].column = 900, s => s.blocks[0].reward = 'constructor', s => s.incoming[0].reward = '__proto__']) {
    const data = structuredClone(original); mutate(data); assert.throws(() => Engine.restore(data));
  }
});
test('practice rewind preserves completion but cannot grant mastery stars', () => {
  const e = empty(); e.incoming = []; e.stats.rewinds = 1; e.end(true); assert.equal(e.outcome.stars, 1);
});
test('a rail endpoint overlap yields a valid separation normal', () => {
  const e = empty(), b = block(e, { type: 'prism' }, 4);
  const hit = sweepRail(b.x + 3, b.y + b.h - 3, -400, 0, 5, b, 0.1);
  assert.ok(hit && hit.depth > 0); assert.ok(Math.abs(Math.hypot(hit.nx, hit.ny) - 1) < 0.00001);
});
test('ordinary trapped contacts cannot farm repeated damage without exiting', () => {
  const e = empty(), a = block(e, { column: 0, hp: 100 }), b = block(e, { column: 1, hp: 100 }); e.fire();
  const p = photon(e, { x: 45, y: 75, r: 9, vx: 420, vy: 0 });
  for (let n = 0; n < 5; n++) e.movePhoton(p, C.DT, n * C.DT);
  assert.equal(a.hp, 99); assert.equal(b.hp, 99); assert.ok(Number.isFinite(p.x + p.y));
});
test('storage failure preserves playable session state and export/import', () => {
  const store = new Storage.Store({ getItem() { throw new Error('private'); }, setItem() { throw new Error('quota'); } });
  store.profile.stars[0] = 3; store.profile.checkpoint = new Engine().snapshot(); assert.equal(store.save(), false);
  const next = new Storage.Store(null); next.import(store.export()); assert.equal(next.profile.stars[0], 3); assert.equal(next.profile.checkpoint.phase, 'aim');
  assert.throws(() => next.import('{bad json')); assert.equal(next.profile.stars[0], 3);
});
test('profile validation strips unknown fields and enforces cosmetic unlocks', () => {
  const data = Storage.fresh(); data.settings.palette = 'nova'; data.unexpected = 'ignored';
  const result = Storage.validate(data); assert.equal(result.settings.palette, 'ion'); assert.equal(result.unexpected, undefined);
  result.stars.fill(1); result.settings.palette = 'nova'; assert.equal(Storage.validate(result).settings.palette, 'nova');
});
test('seeds do not depend on preview calls or cosmetic event consumption', () => {
  const a = new Engine({ mode: 'survival', seed: 'cosmetic-free' }), b = Engine.restore(a.snapshot());
  for (let n = 0; n < 100; n++) { a.preview(); a.drainEvents(); }
  assert.equal(a.rng, b.rng); assert.deepEqual(a.incoming, b.incoming);
});
test('solar storm preview survives saving and spawns two rows without overlap', () => {
  const e = new Engine({ mode: 'survival', seed: 'storm' }); e.wave = 11; e.incoming = e.makeWave();
  assert.equal(e.incomingEcho.length, 7); assert.equal(Engine.restore(e.snapshot()).incomingEcho.length, 7);
  e.returnTarget = 180; e.advance(); assert.equal(e.wave, 12); assert.doesNotThrow(() => Engine.restore(e.snapshot()));
  const keys = e.blocks.map(b => b.column + ',' + b.row); assert.equal(new Set(keys).size, keys.length);
});
test('reserve catches every threatened row in a two-row storm descent', () => {
  const e = empty(); e.mode = 'survival'; e.wave = 11; e.incoming = e.makeWave();
  block(e, { column: 0 }, 16); block(e, { column: 1 }, 17); e.loadout.reserve = 1; e.returnTarget = 180; e.advance();
  assert.equal(e.loadout.reserve, 0); assert.ok(e.blocks.every(b => b.y + b.h < C.DANGER)); assert.doesNotThrow(() => Engine.restore(e.snapshot()));
});
test('imported overlapping blocks and maxed-out upgrade offers are rejected', () => {
  const e = new Engine(); let s = e.snapshot(); s.blocks[1].column = s.blocks[0].column; s.blocks[1].x = s.blocks[0].x;
  assert.throws(() => Engine.restore(s)); s = e.snapshot(); s.phase = 'upgrade'; s.offers = ['power']; s.loadout.damage = 4; assert.throws(() => Engine.restore(s));
});
