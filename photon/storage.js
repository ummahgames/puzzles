(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.PhotonStorage = factory(root.PhotonCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const KEY = 'photon.journey.v2';
  const defaults = () => ({ muted: false, volume: 0.35, reducedMotion: false, contrast: false, trails: true, assistance: true, relativeAim: false, palette: 'ion' });
  const fresh = () => ({ version: 2, stars: Array(24).fill(0), best: { survival: { score: 0, wave: 0 }, daily: { date: '', score: 0, wave: 0 } }, checkpoint: null, settings: defaults() });
  function unlockedPalettes(profile) {
    const choices = ['ion'];
    for (const [index, name] of [[0, 'prism'], [1, 'amber'], [2, 'nova']]) if (profile.stars.slice(index * 6, index * 6 + 6).every(n => n > 0)) choices.push(name);
    return choices;
  }
  function validate(value) {
    const fail = () => { throw new Error('This save is invalid or belongs to another version of Photon.'); };
    if (!value || value.version !== 2 || !Array.isArray(value.stars) || value.stars.length !== 24 || !value.stars.every(n => Number.isInteger(n) && n >= 0 && n <= 3)) fail();
    if (!value.best || !value.best.survival || !value.best.daily || !value.settings) fail();
    for (const mode of ['survival', 'daily']) for (const key of ['score', 'wave']) if (!Number.isInteger(value.best[mode][key]) || value.best[mode][key] < 0 || value.best[mode][key] > 1000000000) fail();
    if (typeof value.best.daily.date !== 'string' || (value.best.daily.date && !/^\d{4}-\d{2}-\d{2}$/.test(value.best.daily.date))) fail();
    const s = value.settings;
    for (const key of ['muted', 'reducedMotion', 'contrast', 'trails', 'assistance', 'relativeAim']) if (typeof s[key] !== 'boolean') fail();
    if (typeof s.volume !== 'number' || !Number.isFinite(s.volume) || s.volume < 0 || s.volume > 1 || !['ion', 'prism', 'amber', 'nova'].includes(s.palette)) fail();
    if (value.checkpoint !== null) Core.validateSnapshot(value.checkpoint);
    const result = fresh();
    result.stars = value.stars.slice();
    result.best.survival = { score: value.best.survival.score, wave: value.best.survival.wave };
    result.best.daily = { date: value.best.daily.date, score: value.best.daily.score, wave: value.best.daily.wave };
    result.checkpoint = value.checkpoint === null ? null : JSON.parse(JSON.stringify(value.checkpoint));
    for (const key of Object.keys(defaults())) result.settings[key] = s[key];
    if (!unlockedPalettes(result).includes(result.settings.palette)) result.settings.palette = 'ion';
    return result;
  }
  class Store {
    constructor(storage) {
      this.storage = storage; this.available = !!storage; this.message = ''; this.loaded = false;
      this.profile = fresh();
      try {
        const raw = storage?.getItem(KEY);
        if (raw) { this.profile = validate(JSON.parse(raw)); this.loaded = true; }
        if (!storage) this.message = 'Session-only progress. Export a save to keep it.';
      } catch (error) {
        this.message = 'Saved data could not be loaded. Your game is still playable; import a backup or reset saves.';
      }
    }
    save() {
      try {
        if (!this.storage) throw new Error('Storage unavailable');
        this.storage.setItem(KEY, JSON.stringify(this.profile));
        this.available = true; this.message = 'Saved on this device. Export to move your journey to another browser.';
        return true;
      } catch (error) { this.available = false; this.message = 'Session-only progress. Storage is unavailable; export a save to keep it.'; return false; }
    }
    import(text) {
      if (typeof text !== 'string' || text.length > 150000) throw new Error('Choose a Photon JSON save smaller than 150 KB.');
      const next = validate(JSON.parse(text));
      this.profile = next; this.save(); return next;
    }
    export() { return JSON.stringify(this.profile, null, 2); }
    reset() { this.profile = fresh(); this.save(); }
  }
  return { Store, validate, fresh, defaults, unlockedPalettes, KEY };
});
