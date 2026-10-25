'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot } = require('./dom-harness.cjs');
const { Engine } = require('../core.js');
const Storage = require('../storage.js');
const solutions = require('./campaign-solutions.json');
function stageOne(app) { app.click('campaignBtn'); app.stage(0); app.action('resume'); }

test('static scripts boot, campaign renders 24 cards, and stage briefing can begin', () => {
  const app = boot(); app.click('campaignBtn'); assert.match(app.nodes.get('chapterList').innerHTML, /data-stage="23"/);
  app.stage(0); assert.equal(app.nodes.get('modal').open, true); assert.equal(app.nodes.get('play').hidden, false);
  app.action('resume'); app.frames(10); assert.equal(app.nodes.get('modal').open, false); assert.equal(app.profile().checkpoint.stageId, 0);
});
test('shell fires, resolves and saves a complete volley without browser access', () => {
  const app = boot(); stageOne(app); app.click('fireBtn'); app.frames(900);
  assert.equal(app.profile().checkpoint.volley, 1); assert.equal(app.profile().checkpoint.phase, 'aim'); assert.equal(app.nodes.get('fireBtn').disabled, false);
});
test('pause freezes gameplay, focus loss opens pause, and resume clears the frame clock', () => {
  const app = boot(); stageOne(app); app.click('fireBtn'); app.frames(30);
  app.click('pauseBtn'); const score = app.nodes.get('scoreLabel').textContent; app.frames(200); assert.equal(app.nodes.get('scoreLabel').textContent, score);
  app.action('resume'); app.windowListeners.blur[0](); assert.equal(app.nodes.get('modal').open, true);
  app.action('resume'); app.frames(900); assert.equal(app.profile().checkpoint.volley, 1);
});
test('touch cancellation never fires; releasing a valid pointer fires exactly once', () => {
  const app = boot(); stageOne(app); app.pointer('pointerdown'); app.pointer('pointercancel'); app.pointer('pointerup'); app.frames(20);
  assert.equal(app.nodes.get('fireBtn').disabled, false);
  app.pointer('pointerdown'); app.pointer('pointerup'); app.pointer('pointerup'); app.frames(900);
  assert.equal(app.profile().checkpoint.volley, 1);
});
test('secondary mouse and extra touch do not hijack a shot', () => {
  const app = boot(); stageOne(app); app.pointer('pointerdown', { pointerType: 'mouse', button: 2 }); app.frames(20); assert.equal(app.nodes.get('fireBtn').disabled, false);
  app.pointer('pointerdown'); app.pointer('pointerdown', { pointerId: 2 }); app.pointer('pointerup', { pointerId: 2 }); assert.equal(app.nodes.get('fireBtn').disabled, false);
  app.pointer('pointerup'); app.frames(900); assert.equal(app.profile().checkpoint.volley, 1);
});
test('release outside the launch region cancels and keyboard can aim/fire', () => {
  const app = boot(); stageOne(app); app.pointer('pointerdown'); app.pointer('pointerup', { clientY: 640 }); assert.equal(app.nodes.get('fireBtn').disabled, false);
  app.dispatchDocument('keydown', { key: 'ArrowLeft', target: app.nodes.get('game') });
  app.dispatchDocument('keydown', { key: ' ', target: app.nodes.get('game'), repeat: false }); app.frames(900); assert.equal(app.profile().checkpoint.volley, 1);
});
test('refresh during flight restores the previous aiming checkpoint', () => {
  const memory = new Map(), app = boot({ memory }); stageOne(app); app.click('fireBtn'); app.frames(30);
  assert.equal(app.profile().checkpoint.volley, 0);
  const refreshed = boot({ memory }); assert.equal(refreshed.nodes.get('continueBtn').hidden, false); refreshed.click('continueBtn'); refreshed.frames(20);
  assert.equal(refreshed.nodes.get('fireBtn').disabled, false); assert.equal(refreshed.profile().checkpoint.volley, 0);
});
test('practice rewind restores one volley and marks mastery as assisted', () => {
  const app = boot(); stageOne(app); app.click('fireBtn'); app.frames(100); app.click('pauseBtn'); app.action('rewind'); app.frames(10);
  assert.equal(app.profile().checkpoint.volley, 0); assert.equal(app.profile().checkpoint.stats.rewinds, 1); assert.equal(app.nodes.get('fireBtn').disabled, false);
});
test('survival seed form creates a reproducible run; replacing checkpoint requires explicit action', () => {
  const app = boot(); app.click('survivalBtn'); app.nodes.get('seedInput').value = 'my-sky'; app.action('survival-start'); app.frames(20);
  assert.equal(app.profile().checkpoint.seed, 'my-sky'); app.click('pauseBtn'); app.action('home'); app.click('dailyBtn');
  assert.equal(app.profile().checkpoint.mode, 'survival'); app.action('start-pending'); assert.equal(app.profile().checkpoint.mode, 'daily');
});
test('settings update safely; reset discards all progress after its confirmation action', () => {
  const app = boot(); app.click('settingsBtn'); const input = app.nodes.get('modalBody').children.find(n => n.dataset.setting === 'contrast'); input.checked = true;
  app.nodes.get('modalBody').dispatch('input', { target: input }); assert.equal(app.profile().settings.contrast, true);
  app.action('reset-confirm'); assert.equal(app.profile().settings.contrast, true); app.action('reset'); assert.equal(app.profile().settings.contrast, false);
});
test('storage unavailable and reduced motion still permit a complete game turn', () => {
  const app = boot({ unavailable: true, reducedMotion: true }); stageOne(app); app.click('fireBtn'); app.frames(1000);
  assert.equal(app.nodes.get('fireBtn').disabled, false); app.click('pauseBtn'); app.action('settings'); assert.match(app.nodes.get('modalBody').innerHTML, /Session-only/);
});
test('campaign win records stars, presents results, and opens the next stage', () => {
  const app = boot(); stageOne(app);
  for (const input of solutions[0].inputs) {
    const saved = app.profile().checkpoint, cosine = Math.cos(input.angle), sine = Math.sin(input.angle);
    const distance = Math.min(200, cosine > 0 ? (350 - saved.launchX) / cosine : (10 - saved.launchX) / cosine);
    app.pointer('pointerdown', { pointerType: 'mouse', clientX: saved.launchX + cosine * distance, clientY: 610 + sine * distance }); app.frames(1300);
  }
  assert.equal(app.profile().stars[0], 3); assert.equal(app.profile().checkpoint, null);
  assert.match(app.nodes.get('modalBody').innerHTML, /Room for more light/);
  app.action('next-stage'); assert.equal(app.profile().checkpoint.stageId, 1);
});
test('saved upgrade screen survives refresh and its card resumes the run', () => {
  const e = new Engine({ mode: 'survival', seed: 'saved-choice' }); e.wave = 5; e.lastChoiceWave = 5; e.offers = e.makeOffers(); e.phase = 'upgrade';
  const profile = Storage.fresh(); profile.checkpoint = e.snapshot(); const memory = new Map([[Storage.KEY, JSON.stringify(profile)]]);
  const app = boot({ memory }); app.click('continueBtn'); assert.match(app.nodes.get('modalBody').innerHTML, /A brighter possibility/);
  const target = { dataset: { upgrade: e.offers[0] }, closest: selector => selector === '[data-upgrade]' ? target : null };
  app.nodes.get('modalBody').dispatch('click', { target }); assert.equal(app.profile().checkpoint.phase, 'aim'); assert.equal(app.nodes.get('modal').open, false);
});
test('invalid save import leaves current progress intact; valid import is restored', async () => {
  const app = boot(); stageOne(app); app.click('pauseBtn'); app.action('settings');
  const handler = app.nodes.get('importFile').listeners.change[0];
  await handler({ target: { value: 'file', files: [{ size: 10, async text() { return '{invalid}'; } }] } });
  assert.equal(app.profile().checkpoint.stageId, 0); assert.match(app.nodes.get('modalBody').innerHTML, /could not be imported/);
  const profile = Storage.fresh(); profile.stars[0] = 3;
  await handler({ target: { value: 'file', files: [{ size: 1000, async text() { return JSON.stringify(profile); } }] } });
  assert.equal(app.profile().stars[0], 3); assert.equal(app.profile().checkpoint, null); assert.equal(app.nodes.get('home').hidden, false);
});
test('export creates a local JSON download and preserves progress', () => {
  const app = boot(); stageOne(app); app.click('pauseBtn'); app.action('settings'); app.action('export');
  assert.ok(app.calls.some(call => call.action === 'click' && call.element.download === 'photon-journey.json'));
  assert.equal(app.profile().checkpoint.stageId, 0);
});
