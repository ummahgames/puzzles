/* Photon: browser shell. Gameplay rules live in the independently testable core. */
(function () {
  'use strict';
  const { Engine, C, aimAngle, clamp } = window.PhotonCore;
  const Content = window.PhotonContent;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), modal = $('modal');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let local = null;
  try { local = window.UmmahProfile || window.localStorage; } catch (error) { /* Session mode is fully playable. */ }
  const store = new window.PhotonStorage.Store(local);
  const renderer = new window.PhotonRenderer(canvas);
  let engine = null, view = 'home', paused = false, speed = 1, accumulator = 0, lastTime = null;
  let pointer = null, toastUntil = 0, modalKind = '', pendingStart = null, previousFocus = null;
  let lastHUD = '', logs = [], slowFrames = 0, resultSaved = false;
  let undoCheckpoint = null;
  const settings = () => store.profile.settings;
  if (!store.loaded) store.profile.settings.reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  class Sound {
    constructor() { this.context = null; this.master = null; this.lastHit = 0; this.sequence = 0; this.voices = 0; }
    unlock() {
      try {
        if (!this.context) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          this.context = new Audio(); this.master = this.context.createGain();
          if (this.context.createDynamicsCompressor) {
            const limiter = this.context.createDynamicsCompressor();
            limiter.threshold.value = -12; limiter.knee.value = 18; limiter.ratio.value = 6; limiter.attack.value = 0.003; limiter.release.value = 0.2;
            this.master.connect(limiter); limiter.connect(this.context.destination);
          } else this.master.connect(this.context.destination);
        }
        if (this.context.state === 'suspended') this.context.resume().catch(() => {});
        this.volume();
      } catch (error) { /* Audio support never gates gameplay. */ }
    }
    volume() { if (this.context && this.master) this.master.gain.setTargetAtTime(settings().muted ? 0 : settings().volume * 0.45, this.context.currentTime, 0.03); }
    play(kind) {
      if (!this.context || settings().muted || this.context.state !== 'running') return;
      if (this.voices >= 24 || (this.voices >= 12 && ['hit', 'bank', 'break'].includes(kind))) return;
      const now = this.context.currentTime;
      if ((kind === 'hit' || kind === 'bank') && now - this.lastHit < 0.065) return;
      if (kind === 'hit' || kind === 'bank') this.lastHit = now;
      const tunes = { hit: [420, 0.06, 0.12], bank: [300, 0.05, 0.07], break: [740, 0.12, 0.1], pickup: [1046, 0.22, 0.15], laser: [180, 0.32, 0.16], nova: [1318, 0.3, 0.14], fire: [240, 0.1, 0.08], saved: [880, 0.28, 0.14], win: [784, 0.45, 0.18], loss: [146, 0.45, 0.13] };
      const [frequency, duration, volume] = tunes[kind] || tunes.hit;
      try {
        const osc = this.context.createOscillator(), gain = this.context.createGain();
        osc.type = kind === 'laser' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(frequency + (kind === 'hit' ? this.sequence++ % 3 * 45 : 0), now);
        if (kind === 'win' || kind === 'pickup') osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
        gain.gain.setValueAtTime(0.001, now); gain.gain.linearRampToValueAtTime(volume, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain); gain.connect(this.master); osc.start(now); this.voices++; osc.stop(now + duration + 0.01);
        osc.onended = () => { this.voices = Math.max(0, this.voices - 1); osc.disconnect(); gain.disconnect(); };
      } catch (error) { /* A busy or unavailable audio context is harmless. */ }
    }
  }
  const sound = new Sound();
  function announce(message) { $('announcer').textContent = message; }
  function toast(message, duration = 2600) { $('boardToast').textContent = message; $('boardToast').classList.add('visible'); toastUntil = performance.now() + duration; announce(message); }
  function applySettings() {
    document.body.classList.toggle('high-contrast', settings().contrast);
    document.body.classList.toggle('reduced-motion', settings().reducedMotion);
    $('muteBtn').setAttribute('aria-pressed', String(settings().muted));
    $('muteBtn').setAttribute('aria-label', settings().muted ? 'Unmute sound' : 'Mute sound');
    $('muteBtn').textContent = settings().muted ? '♪̸' : '♪'; sound.volume();
  }
  function fit() {
    if (view !== 'play') return;
    const rect = $('boardWrap').getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) renderer.resize(rect.width, rect.height);
  }
  function screen(name) {
    view = name;
    for (const id of ['home', 'campaign', 'play']) $(id).hidden = id !== name;
    lastTime = null; accumulator = 0; pointer = null;
    if (name === 'play') { fit(); canvas.focus({ preventScroll: true }); }
    else if (name === 'home') { refreshHome(); $('campaignBtn').focus({ preventScroll: true }); }
    else { renderMap(); $('mapBack').focus({ preventScroll: true }); }
  }
  function refreshHome() {
    const completed = store.profile.stars.filter(n => n > 0).length;
    $('homeProgress').textContent = completed ? completed + ' / 24 stages · ' + store.profile.stars.reduce((a, b) => a + b, 0) + ' mastery stars' : '24 stages · 4 chapters · all on your device';
    if (!store.available) $('homeProgress').textContent += ' · session-only saves';
    $('continueBtn').hidden = !store.profile.checkpoint;
    $('campaignBtn').classList.toggle('primary', !store.profile.checkpoint);
  }
  function renderMap() {
    const stars = store.profile.stars;
    $('starTotal').textContent = stars.reduce((a, b) => a + b, 0) + ' / 72 ✦';
    $('chapterList').innerHTML = Content.chapters.map((chapter, chapterId) => '<section style="--chapter-color:' + chapter.color + '"><div class="chapter-heading"><p class="eyebrow">0' + (chapterId + 1) + '</p><h2>' + chapter.name + '</h2><p>' + chapter.subtitle + '</p></div><div class="stage-grid">' + Content.stages.filter(stage => stage.chapter === chapterId).map(stage => {
      const unlocked = stage.id === 0 || stars[stage.id - 1] > 0 || stars[stage.id] > 0;
      return '<button class="stage-card ' + (unlocked && !stars[stage.id] ? 'current' : '') + '" data-stage="' + stage.id + '" ' + (!unlocked ? 'disabled' : '') + ' aria-label="Stage ' + (stage.id + 1) + ', ' + stage.title + ', ' + (unlocked ? stars[stage.id] + ' of 3 stars' : 'locked') + '"><span class="stage-number">' + String(stage.id + 1).padStart(2, '0') + '</span><span class="stage-name">' + stage.title + '</span><span class="stage-stars" aria-hidden="true">' + (unlocked ? '★'.repeat(stars[stage.id]) + '☆'.repeat(3 - stars[stage.id]) : '⌑') + '</span></button>';
    }).join('') + '</div></section>').join('');
  }
  function openModal(kind, html) {
    if (!modal.open) previousFocus = document.activeElement;
    if (modal.open) modal.close();
    modalKind = kind; paused = view === 'play'; pointer = null; accumulator = 0;
    $('modalBody').innerHTML = html;
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    const focus = modal.querySelector('[autofocus]') || modal.querySelector('button, input, select');
    focus?.focus();
  }
  function closeModal(resume = true) {
    if (modal.open) modal.close();
    modalKind = ''; paused = !resume && view === 'play'; lastTime = null; accumulator = 0;
    if (view === 'play' && resume) canvas.focus({ preventScroll: true });
    else if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    else (view === 'campaign' ? $('mapBack') : $('campaignBtn')).focus({ preventScroll: true });
  }
  function checkpoint() {
    if (!engine) return;
    const snapshot = engine.snapshot();
    if (snapshot) { store.profile.checkpoint = snapshot; store.save(); }
  }
  function requestStart(options) {
    if (store.profile.checkpoint) {
      pendingStart = options;
      openModal('replace', '<p class="eyebrow">A NEW CONSTELLATION</p><h2 id="modalTitle">Start a new journey?</h2><p>Your campaign stars and best scores stay saved. This replaces the current run checkpoint.</p><div class="modal-actions"><button class="button" data-action="back">Keep current run</button><button class="button primary" data-action="start-pending">Start new run ↗</button></div>');
    } else start(options);
  }
  function start(options) {
    closeModal(); engine = new Engine(options); paused = false; speed = 1; resultSaved = false; logs = []; lastHUD = ''; renderer.clear();
    undoCheckpoint = null; screen('play'); setupStage(); processEvents(); updateHUD(); checkpoint();
    if (engine.mode === 'campaign') briefing(); else toast(engine.mode === 'daily' ? 'Same UTC-day seed for everyone. Your scores stay local.' : 'Two wall banks can open a whole new route.', 3500);
  }
  function continueRun() {
    try {
      engine = Engine.restore(store.profile.checkpoint); undoCheckpoint = null; resultSaved = false; speed = 1; logs = []; renderer.clear(); lastHUD = ''; paused = false;
      closeModal(); screen('play'); setupStage(); updateHUD();
      if (engine.phase === 'upgrade') upgrades(); else toast('Welcome back. Your volley is ready.');
    } catch (error) { store.profile.checkpoint = null; store.save(); refreshHome(); messageModal('Checkpoint unavailable', 'The saved run could not be restored. Your campaign stars and best scores are still available.'); }
  }
  function setupStage() {
    const campaign = engine.mode === 'campaign', stage = engine.stage;
    $('chapterLabel').textContent = campaign ? Content.chapters[stage.chapter].name.toUpperCase() + ' / ' + String(stage.id + 1).padStart(2, '0') : engine.mode === 'daily' ? 'A NEW SKY EVERY UTC DAY' : 'ENDLESS POSSIBILITIES';
    $('stageTitle').textContent = campaign ? stage.title : engine.mode === 'daily' ? 'Daily constellation' : 'Survival';
    $('stageLesson').textContent = campaign ? stage.lesson : 'Find the entry lanes. Collect light, choose a build every five waves, and keep the garden above the danger line.';
    $('objectiveText').textContent = campaign ? 'Clear all ' + stage.waves.length + ' waves. Aim for ' + stage.par + ' volleys or fewer.' : 'Survive as many waves as you can. From wave 12, solar storms bring two rows. The incoming preview gives you warning.';
    $('challengeText').textContent = campaign ? stage.challenge : 'Your best: ' + store.profile.best[engine.mode].score.toLocaleString() + ' points.';
    $('seedLabel').textContent = engine.seed;
    log('A new angle', campaign ? stage.title + ' · ' + Content.chapters[stage.chapter].name : 'Seed: ' + engine.seed);
  }
  function briefing() {
    const stage = engine.stage;
    openModal('briefing', '<p class="eyebrow">' + Content.chapters[stage.chapter].name.toUpperCase() + ' · STAGE ' + (stage.id + 1) + '</p><h2 id="modalTitle">' + stage.title + '</h2><p>' + stage.lesson + '</p><div class="help-list"><div class="help-item"><strong>Finish:</strong> clear all ' + stage.waves.length + ' waves before a crystal crosses the danger line.</div><div class="help-item"><strong>Master:</strong> ' + stage.par + ' volleys or fewer. ' + stage.challenge + '</div><div class="help-item"><strong>Aim:</strong> move &amp; click, drag &amp; release, or arrows &amp; Space.</div></div><button class="button primary wide-button" data-action="resume" autofocus>Let there be light ↗</button>');
  }
  function survivalPrompt() {
    const random = window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36) : Date.now().toString(36);
    openModal('seed', '<p class="eyebrow">ENDLESS SURVIVAL</p><h2 id="modalTitle">Choose your sky.</h2><p>Use a new seed or replay a friend’s constellation. Identical seeds and choices produce the same waves.</p><label class="mini-label" for="seedInput">RUN SEED</label><input id="seedInput" type="text" maxlength="80" autocomplete="off"><div class="modal-actions"><button class="button" data-action="back">Back</button><button class="button primary" data-action="survival-start">Launch ↗</button></div>');
    $('seedInput').value = 'sky-' + random;
  }
  function pause() {
    if (view !== 'play' || !engine || engine.phase === 'result') return;
    const rewind = engine.mode === 'campaign' && engine.stageId < 3 && undoCheckpoint && !engine.stats.rewinds ? '<button class="text-button" data-action="rewind">Practice rewind · retry the last volley</button><p class="save-status">One rewind per tutorial stage. Completion still unlocks the next stage; mastery stars require an unassisted run.</p>' : '';
    openModal('pause', '<p class="eyebrow">A MOMENT OF STILLNESS</p><h2 id="modalTitle">Light can wait.</h2><p>Your garden is paused. Take a breath; your next angle will still be here.</p><button class="button primary wide-button" data-action="resume" autofocus>Continue ↗</button><div class="modal-actions"><button class="button" data-action="settings">Settings</button><button class="button" data-action="help">How to play</button></div>' + rewind + '<div class="modal-actions"><button class="button" data-action="restart-confirm">Restart run</button><button class="button" data-action="home">Save &amp; home</button></div>' + (engine.phase === 'aim' ? '' : '<p class="save-status">Leaving now restores the beginning of this volley next time.</p>'));
  }
  function help() {
    openModal('help', '<p class="eyebrow">THE LANGUAGE OF LIGHT</p><h2 id="modalTitle">A little guidance.</h2><div class="help-list"><div class="help-item"><strong>Aim &amp; fire.</strong> Mouse: move and primary click. Touch: hold, drag, release. Release below the launch band to cancel. Keyboard: arrows, Shift for precision, Space to fire.</div><div class="help-item"><strong>Make room.</strong> Each ordinary volley descends the surviving crystals one row. Survival solar storms arrive every fourth wave from wave 12, with two rows and a two-row descent. Clear all scheduled waves to finish a campaign stage.</div><div class="help-item"><strong>Return address.</strong> Your first returning photon sets the next launch position.</div><div class="help-item"><strong>Stored light.</strong> Pickups apply to the next volley, never halfway through the current one. Each shot uses one stored charge of each effect.</div><div class="help-item"><strong>Find a chain.</strong> Pink blooms hit neighbors; wide prism hearts hit the whole garden. Five clears per volley charge a Nova damage pulse for the next shot.</div><div class="help-item"><strong>Different surfaces.</strong> Violet rails always reflect. Amber shields reduce damage on their top face; approach another side.</div><div class="help-item"><strong>Control the pace.</strong> F toggles 2× simulation speed. R recalls after four simulated seconds, spending the turn. Photons automatically recall after eighteen seconds.</div><div class="help-item"><strong>Stars.</strong> One for completion, one for par volleys, one for the stage challenge. No grinding required to open the next stage.</div></div><button class="button primary wide-button" data-action="back">Got it ↗</button>');
  }
  function settingsDialog() {
    const s = settings(), choices = window.PhotonStorage.unlockedPalettes(store.profile);
    const toggle = (key, text) => '<label class="setting-row">' + text + '<input data-setting="' + key + '" type="checkbox" ' + (s[key] ? 'checked' : '') + '></label>';
    openModal('settings', '<p class="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="modalTitle">Your kind of light.</h2>' + toggle('muted', 'Mute sound') + '<label class="setting-row">Sound volume<input data-setting="volume" type="range" min="0" max="1" step="0.05" value="' + s.volume + '"></label>' + toggle('reducedMotion', 'Reduced motion') + toggle('contrast', 'High contrast') + toggle('trails', 'Photon trails') + toggle('assistance', 'Trajectory assistance') + toggle('relativeAim', 'Touch aim from drag direction') + '<label class="setting-row">Photon color<select data-setting="palette">' + choices.map(value => '<option value="' + value + '" ' + (value === s.palette ? 'selected' : '') + '>' + ({ ion: 'Ion cyan', prism: 'Prism violet', amber: 'Amber glow', nova: 'Nova rose' })[value] + '</option>').join('') + '</select></label><p class="save-status">Finish chapters to unlock photon colors. ' + escapeHTML(store.message || 'Progress is stored on this device.') + '</p><div class="modal-actions"><button class="button" data-action="export">Export save</button><button class="button" data-action="import-confirm">Import save</button></div><button class="text-button" data-action="reset-confirm">Reset all local progress</button><button class="button primary wide-button" data-action="back">Done ↗</button>');
  }
  function upgrades() {
    checkpoint();
    openModal('upgrade', '<p class="eyebrow">WAVE ' + engine.wave + ' · SHAPE YOUR CONSTELLATION</p><h2 id="modalTitle">A brighter possibility.</h2><p>Choose one upgrade. It stays with you for this run. Campaign stages each begin with their own loadout.</p><div class="upgrade-list">' + engine.offers.map(id => {
      const card = Content.upgrades.find(c => c.id === id);
      return '<button class="upgrade-card" data-upgrade="' + id + '"><span aria-hidden="true">' + card.icon + '</span><div><strong>' + card.name + '</strong><small>' + card.description + '</small></div></button>';
    }).join('') + '</div>');
    announce('Choose one of three run upgrades.');
  }
  function recordResult() {
    if (resultSaved) return;
    resultSaved = true; const result = engine.outcome;
    if (engine.mode === 'campaign' && result.won) store.profile.stars[engine.stageId] = Math.max(store.profile.stars[engine.stageId], result.stars);
    else if (engine.mode !== 'campaign') {
      const best = store.profile.best[engine.mode];
      const date = engine.mode === 'daily' ? engine.seed.split('/')[1] : '';
      if (engine.mode === 'daily' && best.date !== date) { best.date = date; best.score = 0; best.wave = 0; }
      best.score = Math.max(best.score, result.score); best.wave = Math.max(best.wave, result.wave);
    }
    store.profile.checkpoint = null; store.save(); sound.play(result.won ? 'win' : 'loss');
  }
  function results() {
    recordResult(); const r = engine.outcome, campaign = engine.mode === 'campaign';
    const title = r.won ? engine.stageId === 23 ? 'A new star is born.' : 'Room for more light.' : 'Every ending is an angle.';
    const note = r.won ? engine.stageId === 23 ? 'You completed all four chapters. Return for mastery stars, or bring your skills to Survival.' : 'Garden cleared. The next stage is ready when you are.' : 'A crystal reached the danger line. Try opening a wall route or clearing the lowest row first.';
    const challenge = campaign && r.won ? r.rewinds ? '<p>Practice rewind used · completion star awarded. Replay unassisted for mastery stars.</p>' : '<p>Completion ✓ · Par ' + (r.volleys <= engine.stage.par ? '✓' : '—') + ' · Challenge ' + ((engine.stage.challengeType === 'banks' ? r.banks >= 8 : r.recalls === 0) ? '✓' : '—') + '</p>' : '';
    openModal('result', '<p class="eyebrow">' + (campaign ? 'STAGE ' + (engine.stageId + 1) : 'WAVE ' + r.wave) + ' · ' + (r.won ? 'COMPLETE' : 'RUN COMPLETE') + '</p><h2 id="modalTitle">' + title + '</h2>' + (r.won ? '<div class="result-stars" aria-label="' + r.stars + ' of 3 stars">' + '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars) + '</div>' : '') + '<p>' + note + '</p>' + challenge + '<div class="result-grid"><div><span class="mini-label">SCORE</span><strong>' + r.score.toLocaleString() + '</strong></div><div><span class="mini-label">VOLLEYS</span><strong>' + r.volleys + '</strong></div><div><span class="mini-label">CRYSTALS CLEARED</span><strong>' + r.clears + '</strong></div><div><span class="mini-label">WALL &amp; PRISM BANKS</span><strong>' + r.banks + '</strong></div></div><div class="modal-actions"><button class="button" data-action="retry">Try this sky again</button>' + (campaign && r.won && engine.stageId < 23 ? '<button class="button primary" data-action="next-stage">Next stage ↗</button>' : '<button class="button primary" data-action="home">Home ↗</button>') + '</div>' + (campaign ? '<button class="text-button" data-action="map">Campaign map</button>' : '<p class="save-status">Seed: ' + escapeHTML(engine.seed) + ' · Best: ' + store.profile.best[engine.mode].score.toLocaleString() + '</p>'));
    announce((r.won ? 'Stage complete. ' + r.stars + ' stars.' : 'Run complete.') + ' Score ' + r.score + '.');
  }
  function log(title, detail) {
    logs.push({ title, detail }); logs = logs.slice(-5);
    $('runLog').innerHTML = logs.map(item => '<div class="log-item"><strong>' + escapeHTML(item.title) + '</strong>' + escapeHTML(item.detail) + '</div>').join('');
  }
  function processEvents() {
    for (const event of engine.drainEvents()) {
      renderer.event(event, settings());
      if (['hit', 'break', 'bank', 'pickup', 'laser', 'nova', 'fire', 'saved'].includes(event.type)) sound.play(event.type);
      if (event.type === 'pickup') log(Content.rewards[event.kind].name, 'Stored for the next volley.');
      if (event.type === 'nova') { toast('Nova charged · +1 damage next volley'); log('Nova charged', 'Five clears. Let that light travel further.'); }
      if (event.type === 'saved') { toast('Second sunrise caught the lowest row'); log('A second sunrise', 'One reserve used. The garden lives on.'); }
      if (event.type === 'storm') { toast('Solar storm · the garden descends two rows'); log('Solar storm', 'Two rows arrive. Find the open lane.'); }
      if (event.type === 'overflow') log('Light converted', 'Inventory full · bonus score awarded.');
      if (event.type === 'recall') toast(event.automatic ? 'Photons recalled · the turn still advances' : 'Recalled · your next angle awaits');
      if (event.type === 'ready') { checkpoint(); announce('Wave ' + engine.wave + '. ' + engine.loadout.photons + ' photons. Aim and fire.'); }
      if (event.type === 'upgrade') upgrades();
      if (event.type === 'chosen') log(Content.upgrades.find(c => c.id === event.id).name, 'Added to your run loadout.');
      if (event.type === 'result') results();
    }
  }
  function updateHUD() {
    if (!engine) return;
    const shot = engine.shotParameters();
    const model = [engine.phase, engine.wave, engine.score, shot.photons, shot.damage, engine.resonance, JSON.stringify(engine.pending), Math.floor(engine.elapsed), speed].join('|');
    if (model === lastHUD) return; lastHUD = model;
    $('modeLabel').textContent = engine.mode.toUpperCase();
    $('waveLabel').textContent = 'Wave ' + engine.wave + (engine.mode === 'campaign' ? ' / ' + engine.stage.waves.length : '');
    const activeShot = ['flight', 'settle'].includes(engine.phase) ? engine.shot : shot;
    $('scoreLabel').textContent = engine.score.toLocaleString(); $('photonLabel').textContent = activeShot.photons; $('damageLabel').textContent = activeShot.damage;
    $('resonanceLabel').textContent = Array.from({ length: 5 }, (_, i) => i < engine.resonance % 5 ? '●' : '○').join(' ');
    const buffs = [];
    if (engine.pending.photon) buffs.push('<span class="buff-chip" style="--buff-color:#70e4f2">Next: +' + engine.pending.photon + ' photon' + (engine.pending.photon > 1 ? 's' : '') + '</span>');
    for (const kind of ['overcharge', 'big', 'pierce', 'laser', 'nova']) if (engine.pending[kind]) {
      const reward = Content.rewards[kind] || { name: 'Nova', color: '#ffd38a', description: '+1 damage next volley.' };
      buffs.push('<span class="buff-chip" style="--buff-color:' + reward.color + '" title="' + reward.description + '">' + reward.name + ' ×' + engine.pending[kind] + '</span>');
    }
    if (engine.loadout.reserve) buffs.push('<span class="buff-chip" style="--buff-color:#a8ecc4">Reserve ×' + engine.loadout.reserve + '</span>');
    $('buffRow').innerHTML = buffs.join('') || '<span class="buff-empty">Clear five crystals to charge a Nova pulse.</span>';
    $('fireBtn').disabled = engine.phase !== 'aim'; $('fireBtn').textContent = engine.phase === 'flight' ? 'Light in flight' : engine.phase === 'settle' ? 'Gathering…' : 'Fire volley ↗';
    $('recallBtn').disabled = engine.phase !== 'flight' || engine.elapsed < 4;
    $('recallBtn').textContent = engine.phase === 'flight' && engine.elapsed < 4 ? 'Recall ' + Math.ceil(4 - engine.elapsed) + 's' : 'Recall';
    $('speedBtn').textContent = speed + '× Speed'; $('speedBtn').setAttribute('aria-pressed', String(speed === 2));
    $('turnHint').textContent = engine.phase === 'aim' ? engine.incomingEcho.length ? 'Storm next · clear space for a TWO-row descent' : 'Move & click · drag & release · arrows & Space' : engine.phase === 'flight' ? 'First return sets your next launch · F to fast forward' : engine.incomingEcho.length ? 'Solar storm · surviving crystals descend TWO rows' : 'Surviving crystals descend one row';
  }
  function fire() {
    if (!engine || view !== 'play' || paused || engine.phase !== 'aim') return;
    sound.unlock(); checkpoint(); undoCheckpoint = engine.snapshot(); engine.fire(); pointer = null; processEvents(); updateHUD();
  }
  function toggleSpeed() { speed = speed === 1 ? 2 : 1; updateHUD(); announce(speed + ' times simulation speed.'); }
  function goHome() {
    if (engine && ['aim', 'upgrade'].includes(engine.phase)) checkpoint();
    closeModal(); paused = true; screen('home');
  }
  function messageModal(title, message) { openModal('message', '<h2 id="modalTitle">' + escapeHTML(title) + '</h2><p>' + escapeHTML(message) + '</p><button class="button primary wide-button" data-action="back">Done</button>'); }
  function back() {
    if (view === 'play' && engine?.phase === 'upgrade') upgrades();
    else if (view === 'play' && engine?.phase === 'result') results();
    else if (view === 'play' && ['settings', 'help', 'restart', 'message', 'copy'].includes(modalKind)) pause();
    else closeModal();
  }
  function exportSave() {
    checkpoint();
    const url = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'photon-journey.json'; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copySeed() {
    try { await navigator.clipboard.writeText(engine.seed); toast('Constellation seed copied.'); }
    catch (error) {
      openModal('copy', '<h2 id="modalTitle">Take this sky with you.</h2><p>Copy this seed to replay the same Survival waves.</p><input id="copyInput" type="text" readonly aria-label="Constellation seed"><button class="button primary wide-button" data-action="back">Done</button>');
      $('copyInput').value = engine.seed; $('copyInput').select();
    }
  }

  $('campaignBtn').addEventListener('click', () => screen('campaign'));
  $('continueBtn').addEventListener('click', continueRun);
  $('survivalBtn').addEventListener('click', survivalPrompt);
  $('dailyBtn').addEventListener('click', () => requestStart({ mode: 'daily', seed: 'daily/' + new Date().toISOString().slice(0, 10) + '/v' + C.VERSION }));
  $('settingsBtn').addEventListener('click', settingsDialog);
  $('mapBack').addEventListener('click', () => screen('home'));
  $('chapterList').addEventListener('click', event => {
    const card = event.target.closest('[data-stage]');
    if (card && !card.disabled) requestStart({ mode: 'campaign', stageId: Number(card.dataset.stage) });
  });
  $('fireBtn').addEventListener('click', fire);
  $('speedBtn').addEventListener('click', toggleSpeed);
  $('recallBtn').addEventListener('click', () => { if (!paused && engine?.recall()) { processEvents(); updateHUD(); } });
  $('pauseBtn').addEventListener('click', pause);
  $('helpBtn').addEventListener('click', help);
  $('playHome').addEventListener('click', event => { event.preventDefault(); pause(); });
  $('copySeedBtn').addEventListener('click', copySeed);
  $('muteBtn').addEventListener('click', () => { settings().muted = !settings().muted; sound.unlock(); applySettings(); store.save(); });
  modal.addEventListener('cancel', event => { event.preventDefault(); if (modalKind !== 'upgrade') back(); });
  $('modalBody').addEventListener('click', event => {
    const card = event.target.closest('[data-upgrade]');
    if (card && engine?.choose(card.dataset.upgrade)) { closeModal(); processEvents(); updateHUD(); return; }
    const button = event.target.closest('[data-action]'); if (!button) return;
    switch (button.dataset.action) {
      case 'resume': closeModal(); sound.unlock(); break;
      case 'back': back(); break;
      case 'settings': settingsDialog(); break;
      case 'help': help(); break;
      case 'home': goHome(); break;
      case 'map': closeModal(); paused = true; screen('campaign'); break;
      case 'survival-start': { const seed = $('seedInput').value.trim() || 'photon'; requestStart({ mode: 'survival', seed }); break; }
      case 'start-pending': { const options = pendingStart; pendingStart = null; start(options); break; }
      case 'retry': start({ mode: engine.mode, stageId: engine.stageId, seed: engine.seed }); break;
      case 'rewind':
        if (engine.mode === 'campaign' && engine.stageId < 3 && undoCheckpoint && !engine.stats.rewinds) {
          engine = Engine.restore(undoCheckpoint); engine.stats.rewinds = 1; undoCheckpoint = null; renderer.clear(); checkpoint(); closeModal(); lastHUD = ''; updateHUD(); toast('Practice rewind · try a different angle');
        }
        break;
      case 'next-stage': start({ mode: 'campaign', stageId: engine.stageId + 1 }); break;
      case 'restart-confirm': openModal('restart', '<h2 id="modalTitle">Begin this sky again?</h2><p>This run restarts with the same seed and starting loadout. Your saved stars and best scores stay intact.</p><div class="modal-actions"><button class="button" data-action="back">Continue run</button><button class="button danger" data-action="retry">Restart</button></div>'); break;
      case 'export': exportSave(); break;
      case 'import-confirm': openModal('import', '<h2 id="modalTitle">Restore another journey?</h2><p>Importing replaces local progress, settings, and the current checkpoint. Export your current save first if you want a backup.</p><div class="modal-actions"><button class="button" data-action="settings">Back</button><button class="button primary" data-action="import">Choose JSON file</button></div>'); break;
      case 'import': $('importFile').click(); break;
      case 'reset-confirm': openModal('reset', '<h2 id="modalTitle">Start with a clean sky?</h2><p>This removes campaign stars, best scores, settings, and the run checkpoint from this device.</p><div class="modal-actions"><button class="button" data-action="settings">Keep my journey</button><button class="button danger" data-action="reset">Reset progress</button></div>'); break;
      case 'reset': store.reset(); engine = null; applySettings(); closeModal(); screen('home'); break;
    }
  });
  $('modalBody').addEventListener('input', event => {
    const input = event.target, key = input.dataset.setting;
    if (!key || !Object.prototype.hasOwnProperty.call(settings(), key)) return;
    settings()[key] = input.type === 'checkbox' ? input.checked : key === 'volume' ? Number(input.value) : input.value;
    applySettings(); store.save();
  });
  $('importFile').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 150000) throw new Error('Choose a save smaller than 150 KB.');
      store.import(await file.text()); engine = null; renderer.clear(); applySettings(); closeModal(); screen('home');
      messageModal('Journey restored', 'Your imported progress is ready. Continue the saved run or explore the campaign.');
    } catch (error) { messageModal('Save could not be imported', error.message); }
    event.target.value = '';
  });

  function virtual(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * C.W, y: (event.clientY - rect.top) / rect.height * C.H };
  }
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    if (paused || !engine || engine.phase !== 'aim' || pointer || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); canvas.focus({ preventScroll: true }); sound.unlock();
    const p = virtual(event);
    if (event.pointerType === 'mouse') { if (p.y < C.LAUNCH - 6) { engine.setAngle(aimAngle(p.x, p.y, engine.launchX)); fire(); } return; }
    pointer = { id: event.pointerId, x: p.x, y: p.y, angle: engine.angle, valid: p.y < C.LAUNCH + 12 };
    canvas.setPointerCapture(event.pointerId);
    if (!settings().relativeAim && p.y < C.LAUNCH) engine.setAngle(aimAngle(p.x, p.y, engine.launchX));
  });
  canvas.addEventListener('pointermove', event => {
    if (paused || !engine || engine.phase !== 'aim') return;
    const p = virtual(event);
    if (event.pointerType === 'mouse') { if (p.y < C.LAUNCH - 6) engine.setAngle(aimAngle(p.x, p.y, engine.launchX)); }
    else if (pointer?.id === event.pointerId) {
      pointer.valid = p.y < C.LAUNCH + 12 && p.x >= -20 && p.x <= C.W + 20;
      if (settings().relativeAim) engine.setAngle(pointer.angle + (p.x - pointer.x) * 0.006);
      else if (p.y < C.LAUNCH - 6) engine.setAngle(aimAngle(p.x, p.y, engine.launchX));
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const p = virtual(event), shouldFire = pointer.valid && p.y < C.LAUNCH + 12 && p.x >= -20 && p.x <= C.W + 20;
    pointer = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (shouldFire) fire();
  });
  function cancelPointer() { pointer = null; }
  canvas.addEventListener('pointercancel', cancelPointer); canvas.addEventListener('lostpointercapture', cancelPointer);
  document.addEventListener('keydown', event => {
    if (view !== 'play' || !engine || document.querySelector?.('dialog[open]')?.open) return;
    if (event.key === 'Escape') { if (!modal.open) { event.preventDefault(); pause(); } return; }
    if (modal.open || paused || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); engine.setAngle(engine.angle + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 0.25 : 1) * Math.PI / 180); }
    else if ((event.key === ' ' || event.key === 'Enter') && event.target === canvas) { event.preventDefault(); if (!event.repeat) fire(); }
    else if (event.key.toLowerCase() === 'f' && !event.repeat) { event.preventDefault(); toggleSpeed(); }
    else if (event.key.toLowerCase() === 'r' && !event.repeat) { event.preventDefault(); if (engine.recall()) { processEvents(); updateHUD(); } }
  });
  function autoPause() { if (view === 'play' && engine && !modal.open && ['aim', 'flight', 'settle'].includes(engine.phase)) pause(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); lastTime = null; accumulator = 0; });
  window.addEventListener('blur', autoPause); window.addEventListener('resize', fit);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe($('boardWrap'));
  function frame(timestamp) {
    requestAnimationFrame(frame);
    const delta = lastTime === null ? 0 : Math.min(0.08, Math.max(0, (timestamp - lastTime) / 1000)); lastTime = timestamp;
    if (view !== 'play' || !engine || document.querySelector?.('dialog[open]')?.open) return;
    if (delta > 0.026) slowFrames = Math.min(60, slowFrames + 1); else slowFrames = Math.max(0, slowFrames - 0.2);
    if (!paused) {
      accumulator += delta * speed;
      while (accumulator >= C.DT && !paused) { engine.step(); accumulator -= C.DT; processEvents(); }
      renderer.update(delta, settings());
    }
    renderer.draw(engine, settings(), slowFrames > 20); updateHUD();
    if (toastUntil && timestamp > toastUntil) { $('boardToast').classList.remove('visible'); toastUntil = 0; }
  }
  applySettings(); refreshHome(); requestAnimationFrame(frame);
})();
