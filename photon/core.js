(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./content.js'));
  else root.PhotonCore = factory(root.PhotonContent);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Content) {
  'use strict';
  const C = Object.freeze({ W: 360, H: 640, TOP: 62, COLS: 8, CW: 45, CH: 28, PAD: 3, DANGER: 568, LAUNCH: 610, R: 5, SPEED: 420, DT: 1 / 120, MAX: 60, TIMEOUT: 18, VERSION: 2 });
  const EPS = 0.00001;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const copy = value => JSON.parse(JSON.stringify(value));
  const isReward = kind => typeof kind === 'string' && Object.prototype.hasOwnProperty.call(Content.rewards, kind);
  const freshPending = () => ({ photon: 0, overcharge: 0, big: 0, pierce: 0, laser: 0, nova: 0 });
  function hashSeed(seed) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0 || 1;
  }
  function aimAngle(x, y, launchX) {
    return clamp(Math.atan2(y - C.LAUNCH, x - launchX), -Math.PI + Math.PI / 12, -Math.PI / 12);
  }
  function circleOverlap(x, y, r, b) {
    if (b.type === 'prism') {
      const line = railLine(b), dx = line.x2 - line.x1, dy = line.y2 - line.y1;
      const t = clamp(((x - line.x1) * dx + (y - line.y1) * dy) / (dx * dx + dy * dy), 0, 1);
      return Math.hypot(x - line.x1 - dx * t, y - line.y1 - dy * t) < r + 0.2;
    }
    return Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h)) < r + 0.2;
  }
  function circleTime(x, y, vx, vy, cx, cy, r, maxT) {
    const dx = x - cx, dy = y - cy, a = vx * vx + vy * vy;
    if (a < EPS) return null;
    const dot = dx * vx + dy * vy, discriminant = dot * dot - a * (dx * dx + dy * dy - r * r);
    if (discriminant < 0) return null;
    const t = (-dot - Math.sqrt(discriminant)) / a;
    if (t < -EPS || t > maxT + EPS) return null;
    const hx = x + vx * Math.max(0, t) - cx, hy = y + vy * Math.max(0, t) - cy, len = Math.hypot(hx, hy);
    if (len < EPS) return null;
    const nx = hx / len, ny = hy / len;
    if (vx * nx + vy * ny >= -EPS) return null;
    return { t: Math.max(0, t), nx, ny, depth: 0 };
  }
  function sweepBox(x, y, vx, vy, r, b, maxT) {
    const x0 = b.x, x1 = b.x + b.w, y0 = b.y, y1 = b.y + b.h;
    const cx = clamp(x, x0, x1), cy = clamp(y, y0, y1), dx = x - cx, dy = y - cy, distance = Math.hypot(dx, dy);
    if (distance < r - EPS || (distance < EPS && x >= x0 && x <= x1 && y >= y0 && y <= y1)) {
      if (distance > EPS) return { t: 0, nx: dx / distance, ny: dy / distance, depth: r - distance };
      const faces = [ { distance: x - x0, nx: -1, ny: 0 }, { distance: x1 - x, nx: 1, ny: 0 }, { distance: y - y0, nx: 0, ny: -1 }, { distance: y1 - y, nx: 0, ny: 1 } ];
      faces.sort((a, z) => a.distance - z.distance);
      return { t: 0, nx: faces[0].nx, ny: faces[0].ny, depth: r + faces[0].distance };
    }
    let best = null;
    function candidate(t, nx, ny, inFace) {
      if (!inFace || t < -EPS || t > maxT + EPS || vx * nx + vy * ny >= -EPS) return;
      if (!best || t < best.t) best = { t: Math.max(0, t), nx, ny, depth: 0 };
    }
    if (vx > EPS) { const t = (x0 - r - x) / vx, py = y + vy * t; candidate(t, -1, 0, py >= y0 && py <= y1); }
    if (vx < -EPS) { const t = (x1 + r - x) / vx, py = y + vy * t; candidate(t, 1, 0, py >= y0 && py <= y1); }
    if (vy > EPS) { const t = (y0 - r - y) / vy, px = x + vx * t; candidate(t, 0, -1, px >= x0 && px <= x1); }
    if (vy < -EPS) { const t = (y1 + r - y) / vy, px = x + vx * t; candidate(t, 0, 1, px >= x0 && px <= x1); }
    if (r > 0) for (const [px, py, sx, sy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]]) {
      const hit = circleTime(x, y, vx, vy, px, py, r, maxT);
      if (hit && (x + vx * hit.t - px) * sx >= -EPS && (y + vy * hit.t - py) * sy >= -EPS && (!best || hit.t < best.t)) best = hit;
    }
    return best;
  }
  function railLine(b) {
    return { x1: b.x + 4, y1: b.flip ? b.y + 4 : b.y + b.h - 4, x2: b.x + b.w - 4, y2: b.flip ? b.y + b.h - 4 : b.y + 4 };
  }
  function sweepRail(x, y, vx, vy, r, b, maxT) {
    const line = railLine(b), dx = line.x2 - line.x1, dy = line.y2 - line.y1, len = Math.hypot(dx, dy);
    const tx = dx / len, ty = dy / len, nx = -ty, ny = tx;
    const distance = (x - line.x1) * nx + (y - line.y1) * ny, vn = vx * nx + vy * ny;
    const projection = (x - line.x1) * tx + (y - line.y1) * ty;
    if (projection < 0 || projection > len) {
      const cx = projection < 0 ? line.x1 : line.x2, cy = projection < 0 ? line.y1 : line.y2;
      const ex = x - cx, ey = y - cy, distanceToEnd = Math.hypot(ex, ey);
      if (distanceToEnd < r - EPS) {
        const speed = Math.hypot(vx, vy);
        return { t: 0, nx: distanceToEnd > EPS ? ex / distanceToEnd : speed > EPS ? -vx / speed : 1, ny: distanceToEnd > EPS ? ey / distanceToEnd : speed > EPS ? -vy / speed : 0, depth: r - distanceToEnd };
      }
    }
    if (Math.abs(distance) < r - EPS && projection >= 0 && projection <= len) {
      const sign = Math.sign(distance) || -Math.sign(vn) || 1;
      return { t: 0, nx: nx * sign, ny: ny * sign, depth: r - Math.abs(distance) };
    }
    let best = null;
    if (Math.abs(vn) > EPS) {
      const sign = vn < 0 ? 1 : -1, t = (sign * r - distance) / vn;
      const along = projection + (vx * tx + vy * ty) * t;
      if (t >= -EPS && t <= maxT + EPS && along >= 0 && along <= len) best = { t: Math.max(0, t), nx: nx * sign, ny: ny * sign, depth: 0 };
    }
    for (const [cx, cy] of [[line.x1, line.y1], [line.x2, line.y2]]) {
      const hit = circleTime(x, y, vx, vy, cx, cy, r, maxT);
      if (hit && (!best || hit.t < best.t)) best = hit;
    }
    return best;
  }
  class Engine {
    constructor(options = {}) {
      this.mode = ['campaign', 'survival', 'daily'].includes(options.mode) ? options.mode : 'campaign';
      this.stageId = clamp(Number.isInteger(options.stageId) ? options.stageId : 0, 0, 23);
      this.seed = String(options.seed || (this.mode === 'campaign' ? 'stage-' + this.stageId : 'photon')).slice(0, 80);
      this.rng = hashSeed(this.seed);
      this.phase = 'aim'; this.blocks = []; this.photons = []; this.events = []; this.nextId = 1;
      this.launchX = 180; this.angle = -Math.PI / 2; this.wave = 0; this.volley = 0;
      this.score = 0; this.resonance = 0; this.pending = freshPending();
      this.loadout = { photons: this.mode === 'campaign' ? this.stage.photons : 3, damage: this.mode === 'campaign' ? this.stage.damage : 1, bank: 0, blast: 0, reserve: 0, capacity: 3 };
      this.stats = { damage: 0, clears: 0, banks: 0, recalls: 0, novas: 0, rewinds: 0 };
      this.shot = null; this.elapsed = 0; this.spawned = 0; this.firstReturn = null; this.transition = 0;
      this.offers = []; this.lastChoiceWave = 0; this.outcome = null;
      if (this.mode === 'campaign') for (const rail of this.stage.rails) this.blocks.push(this.makeBlock({ ...rail, type: 'prism', hp: 1 }, rail.row));
      this.incoming = this.makeWave(); this.spawnWave();
      if (this.mode === 'campaign') for (let i = 1; i < this.stage.openingRows; i++) {
        for (const b of this.blocks) if (b.type !== 'prism') { b.row++; b.y += C.CH; }
        this.spawnWave();
      }
      if (this.mode === 'campaign' && this.stage.openingOffset) {
        for (const b of this.blocks) if (b.type !== 'prism') { b.row += this.stage.openingOffset; b.y += this.stage.openingOffset * C.CH; }
        this.rebuildGrid();
      }
      this.emit('ready');
    }
    get stage() { return Content.stages[this.stageId]; }
    random() {
      // Mulberry32, with explicit serialized state.
      this.rng = (this.rng + 0x6D2B79F5) >>> 0;
      let t = this.rng;
      t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    emit(type, data = {}) { this.events.push({ ...data, type }); }
    drainEvents() { const events = this.events; this.events = []; return events; }
    makeBlock(cell, row = 0) {
      return { id: this.nextId++, column: cell.column, row, x: cell.column * C.CW + C.PAD, y: C.TOP + row * C.CH + C.PAD, w: C.CW * (cell.wide ? 2 : 1) - C.PAD * 2, h: C.CH - C.PAD * 2, hp: cell.hp, maxHp: cell.hp, type: cell.type || 'normal', reward: cell.reward || null, flip: !!cell.flip, alive: true };
    }
    makeWave() {
      this.incomingEcho = [];
      if (this.mode === 'campaign') return copy(this.stage.waves[this.wave] || []);
      const number = this.wave + 1, pattern = Content.survivalPatterns[Math.floor(this.random() * Content.survivalPatterns.length)];
      const hp = Math.min(96, 1 + Math.floor(number / 2) + Math.floor(Math.max(0, number - 10) * 0.8)), cells = [];
      for (let col = 0; col < 8; col++) if (pattern[col] === '#') {
        const roll = this.random();
        const type = number > 8 && roll < 0.12 ? 'shield' : number > 3 && roll < 0.28 ? 'bomb' : 'normal';
        cells.push({ column: col, type, hp: hp + (type === 'shield' ? 1 : 0), reward: null });
      }
      const chosen = Math.floor(this.random() * cells.length);
      cells[chosen].reward = number % 2 === 0 || number === 1 ? 'photon' : ['overcharge', 'pierce', 'big', 'laser'][Math.floor(this.random() * 4)];
      // Announced solar storms add a second row, with one clear entry lane.
      if (number >= 12 && number % 4 === 0) {
        const gap = Math.floor(this.random() * 8);
        for (let column = 0; column < 8; column++) if (column !== gap) this.incomingEcho.push({ column, hp, type: column === (gap + 4) % 8 ? 'bomb' : number >= 24 ? 'shield' : 'normal', reward: null });
      }
      // Predictable relief waves stop health growth becoming a solid wall.
      if (number % 6 === 0 && !this.incomingEcho.length) {
        const relief = cells.filter((_, i) => i % 2 === 0).map(c => ({ ...c, hp: Math.max(1, hp - 1), reward: null }));
        relief[0].reward = 'photon'; return relief;
      }
      return cells;
    }
    spawnWave() {
      if (!this.incoming.length) return;
      const storm = this.incomingEcho.length > 0;
      for (const cell of this.incoming) this.blocks.push(this.makeBlock(cell, storm ? 1 : 0));
      for (const cell of this.incomingEcho) this.blocks.push(this.makeBlock(cell));
      this.wave++;
      this.incoming = this.makeWave(); this.rebuildGrid();
      this.emit('wave', { wave: this.wave });
      if (storm) this.emit('storm', { wave: this.wave });
    }
    rebuildGrid() {
      this.grid = Array.from({ length: 8 * 24 }, () => []);
      for (const b of this.blocks) if (b.alive) {
        for (let row = Math.floor(b.y / C.CH); row <= Math.floor((b.y + b.h) / C.CH); row++)
          for (let col = Math.floor(b.x / C.CW); col <= Math.floor((b.x + b.w) / C.CW); col++)
            if (col >= 0 && col < 8 && row >= 0 && row < 24) this.grid[row * 8 + col].push(b);
      }
    }
    query(x, y, vx, vy, r, time, ignore = new Set()) {
      let best = null;
      function add(hit, kind, block = null) {
        if (!hit || hit.t < -EPS || hit.t > time + EPS) return;
        if (!best || hit.t < best.t - EPS || (Math.abs(hit.t - best.t) < EPS && (block ? block.id : 0) < (best.block ? best.block.id : 0))) best = { ...hit, kind, block };
      }
      if (vx < -EPS) add({ t: Math.max(0, (r - x) / vx), nx: 1, ny: 0, depth: Math.max(0, r - x) }, 'wall');
      if (vx > EPS) add({ t: Math.max(0, (C.W - r - x) / vx), nx: -1, ny: 0, depth: Math.max(0, x + r - C.W) }, 'wall');
      if (vy < -EPS) add({ t: Math.max(0, (r - y) / vy), nx: 0, ny: 1, depth: Math.max(0, r - y) }, 'wall');
      if (vy > EPS) add({ t: Math.max(0, (C.LAUNCH - y) / vy), nx: 0, ny: -1 }, 'return');
      const minCol = clamp(Math.floor((Math.min(x, x + vx * time) - r) / C.CW), 0, 7), maxCol = clamp(Math.floor((Math.max(x, x + vx * time) + r) / C.CW), 0, 7);
      const minRow = clamp(Math.floor((Math.min(y, y + vy * time) - r) / C.CH), 0, 23), maxRow = clamp(Math.floor((Math.max(y, y + vy * time) + r) / C.CH), 0, 23);
      const seen = new Set();
      for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) for (const b of this.grid[row * 8 + col]) {
        if (!b.alive || seen.has(b.id) || ignore.has(b.id)) continue;
        seen.add(b.id);
        add((b.type === 'prism' ? sweepRail : sweepBox)(x, y, vx, vy, r, b, time), 'block', b);
      }
      return best;
    }
    setAngle(angle) { if (this.phase === 'aim') this.angle = clamp(angle, -Math.PI + Math.PI / 12, -Math.PI / 12); }
    shotParameters() {
      return { ...this.loadout, photons: clamp(this.loadout.photons + this.pending.photon, 1, C.MAX), radius: this.pending.big ? 9 : C.R, damage: this.loadout.damage + (this.pending.overcharge ? 1 : 0) + (this.pending.nova ? 1 : 0), pierce: this.pending.pierce ? 2 : 0, laser: this.pending.laser > 0, nova: this.pending.nova > 0 };
    }
    fire() {
      if (this.phase !== 'aim') return false;
      this.commitPhotons();
      this.shot = Object.freeze(this.shotParameters());
      this.launchX = clamp(this.launchX, this.shot.radius, C.W - this.shot.radius);
      for (const kind of ['big', 'overcharge', 'pierce', 'laser', 'nova']) if (this.pending[kind] > 0) this.pending[kind]--;
      this.volley++; this.phase = 'flight'; this.elapsed = 0; this.spawned = 0; this.firstReturn = null;
      this.photons = []; this.resonance = 0; this.interval = Math.min(0.065, 1.5 / this.shot.photons);
      this.emit('fire', { nova: this.shot.nova });
      if (this.shot.laser) this.laser();
      return true;
    }
    commitPhotons() {
      const requested = this.loadout.photons + this.pending.photon;
      if (requested > C.MAX) { this.score += (requested - C.MAX) * 25; this.emit('overflow', { kind: 'photon' }); }
      this.loadout.photons = Math.min(C.MAX, requested); this.pending.photon = 0;
    }
    collect(kind, x, y) {
      if (!isReward(kind)) return;
      this.score += 10;
      if (kind === 'photon') this.pending.photon++;
      else if (this.pending[kind] < this.loadout.capacity) this.pending[kind]++;
      else { this.score += 25; this.emit('overflow', { kind }); }
      this.emit('pickup', { kind, x, y });
    }
    damageBlock(block, damage, normal = null, source = 'photon') {
      const queue = [{ block, damage, normal, source }];
      while (queue.length) {
        const item = queue.shift(), b = item.block;
        if (!b.alive || b.type === 'prism') continue;
        const shielded = b.type === 'shield' && item.normal && item.normal.ny < -0.5;
        const amount = Math.min(b.hp, Math.max(1, shielded ? Math.ceil(item.damage / 2) : item.damage));
        b.hp -= amount; this.score += amount; this.stats.damage += amount;
        this.emit('hit', { id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2, damage: amount, shielded });
        if (b.hp > 0) continue;
        b.alive = false; this.score += 5; this.stats.clears++; this.resonance++;
        this.emit('break', { ...b, crystalType: b.type });
        if (b.reward) this.collect(b.reward, b.x + b.w / 2, b.y + b.h / 2);
        if (this.resonance % 5 === 0 && this.pending.nova < this.loadout.capacity) {
          this.pending.nova++; this.stats.novas++; this.emit('nova', { x: b.x + b.w / 2, y: b.y + b.h / 2 });
        }
        if (b.type === 'bomb' || b.type === 'core') {
          const radius = b.type === 'core' ? C.W : 74;
          const blast = 2 + this.loadout.blast;
          this.emit('blast', { x: b.x + b.w / 2, y: b.y + b.h / 2, radius, core: b.type === 'core' });
          for (const other of this.blocks) if (other.alive && other.type !== 'prism' && Math.hypot(other.x + other.w / 2 - b.x - b.w / 2, other.y + other.h / 2 - b.y - b.h / 2) <= radius)
            queue.push({ block: other, damage: blast, normal: null, source: 'blast' });
        }
      }
    }
    spawnPhoton() {
      const id = this.spawned++;
      this.photons.push({ id, x: this.launchX, y: C.LAUNCH, vx: Math.cos(this.angle) * C.SPEED, vy: Math.sin(this.angle) * C.SPEED, r: this.shot.radius, pierce: this.shot.pierce, banks: 0, active: true, contacts: new Set(), passed: new Set(), trail: [] });
    }
    movePhoton(p, dt, baseTime) {
      if (!p.passed) p.passed = new Set();
      for (const id of p.contacts) {
        const b = this.blocks.find(b => b.id === id);
        if (!b || !b.alive || !circleOverlap(p.x, p.y, p.r, b)) { p.contacts.delete(id); p.passed.delete(id); }
      }
      let remaining = dt, used = 0;
      for (let iteration = 0; iteration < 32 && remaining > EPS && p.active; iteration++) {
        for (const id of p.contacts) {
          const b = this.blocks.find(b => b.id === id);
          if (!b || !b.alive || !circleOverlap(p.x, p.y, p.r, b)) { p.contacts.delete(id); p.passed.delete(id); }
        }
        const hit = this.query(p.x, p.y, p.vx, p.vy, p.r, remaining, p.passed);
        if (!hit) { p.x += p.vx * remaining; p.y += p.vy * remaining; break; }
        p.x += p.vx * hit.t; p.y += p.vy * hit.t;
        remaining -= hit.t; used += hit.t;
        if (hit.kind === 'return') {
          p.active = false;
          const returned = { x: clamp(p.x, p.r, C.W - p.r), time: baseTime + used, id: p.id };
          if (!this.firstReturn || returned.time < this.firstReturn.time - EPS || (Math.abs(returned.time - this.firstReturn.time) < EPS && returned.id < this.firstReturn.id)) this.firstReturn = returned;
          this.emit('return', { x: returned.x, first: this.firstReturn === returned });
          break;
        }
        if (hit.kind === 'block' && hit.block.type !== 'prism') {
          const entry = !p.contacts.has(hit.block.id);
          if (entry) {
            p.contacts.add(hit.block.id);
            const bonus = Math.min(this.shot.bank, Math.floor(p.banks / 2));
            this.damageBlock(hit.block, this.shot.damage + bonus, hit);
          }
          if (entry && p.pierce > 0) { p.pierce--; p.passed.add(hit.block.id); p.x += p.vx * EPS; p.y += p.vy * EPS; remaining = Math.max(0, remaining - EPS); continue; }
        }
        const dot = p.vx * hit.nx + p.vy * hit.ny;
        if (dot < 0) { p.vx -= 2 * dot * hit.nx; p.vy -= 2 * dot * hit.ny; }
        p.x += hit.nx * ((hit.depth || 0) + 0.001); p.y += hit.ny * ((hit.depth || 0) + 0.001);
        if (hit.kind === 'wall' || hit.block?.type === 'prism') {
          p.banks++; this.stats.banks++;
          this.emit('bank', { x: p.x, y: p.y, charged: this.shot.bank > 0 && p.banks % 2 === 0 });
        }
        // At the safety limit leave remaining movement for the next step, never tunnel.
      }
    }
    step(dt = C.DT) {
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) throw new Error('Invalid simulation step.');
      if (this.phase === 'settle') {
        this.transition += dt;
        if (this.transition >= 0.34) this.advance();
        return;
      }
      if (this.phase !== 'flight') return;
      const base = this.elapsed; this.elapsed += dt;
      while (this.spawned < this.shot.photons && this.spawned * this.interval <= this.elapsed + EPS) this.spawnPhoton();
      for (const p of this.photons) if (p.active) this.movePhoton(p, dt, base);
      if (this.elapsed >= C.TIMEOUT) { this.recall(true); return; }
      if (this.spawned === this.shot.photons && this.photons.every(p => !p.active)) this.finishVolley();
    }
    recall(automatic = false) {
      if (this.phase !== 'flight' || (!automatic && this.elapsed < 4)) return false;
      this.stats.recalls++; this.spawned = this.shot.photons;
      for (const p of this.photons) p.active = false;
      this.emit('recall', { automatic }); this.finishVolley(); return true;
    }
    finishVolley() {
      this.phase = 'settle'; this.transition = 0;
      this.returnTarget = this.firstReturn ? this.firstReturn.x : this.launchX;
      this.emit('gather', { from: this.launchX, to: this.returnTarget });
    }
    advance() {
      this.launchX = this.returnTarget; this.photons = [];
      this.commitPhotons();
      const descentRows = this.incomingEcho.length ? 2 : 1;
      for (const b of this.blocks) if (b.alive && b.type !== 'prism') { b.row += descentRows; b.y += C.CH * descentRows; }
      this.blocks = this.blocks.filter(b => b.alive);
      const threats = this.blocks.filter(b => b.type !== 'prism' && b.y + b.h >= C.DANGER);
      if (threats.length) {
        if (this.loadout.reserve) {
          this.loadout.reserve--;
          for (const b of threats) { b.alive = false; this.emit('break', { ...b, crystalType: b.type }); }
          this.blocks = this.blocks.filter(b => b.alive); this.emit('saved');
        } else { this.rebuildGrid(); this.end(false); return; }
      }
      const targets = this.blocks.filter(b => b.type !== 'prism');
      if (this.mode === 'campaign' && !targets.length && !this.incoming.length) { this.rebuildGrid(); this.end(true); return; }
      this.spawnWave(); this.rebuildGrid();
      if (this.wave % 5 === 0 && this.wave !== this.lastChoiceWave && (this.mode !== 'campaign' || this.stageId >= 4)) {
        this.lastChoiceWave = this.wave; this.offers = this.makeOffers();
        if (this.offers.length) { this.phase = 'upgrade'; this.emit('upgrade'); return; }
      }
      this.phase = 'aim'; this.emit('ready');
    }
    makeOffers() {
      const eligible = Content.upgrades.filter(u => u.id === 'swarm' ? this.loadout.photons < C.MAX : u.id === 'power' ? this.loadout.damage < u.cap : this.loadout[u.id] < u.cap).map(u => u.id);
      for (let i = eligible.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [eligible[i], eligible[j]] = [eligible[j], eligible[i]]; }
      return eligible.slice(0, 3);
    }
    choose(id) {
      if (this.phase !== 'upgrade' || !this.offers.includes(id)) return false;
      if (id === 'swarm') this.loadout.photons = Math.min(C.MAX, this.loadout.photons + 2);
      else if (id === 'power') this.loadout.damage++;
      else this.loadout[id]++;
      this.offers = []; this.phase = 'aim'; this.emit('chosen', { id }); this.emit('ready'); return true;
    }
    end(won) {
      this.phase = 'result';
      let stars = 0;
      if (won && this.mode === 'campaign') {
        const challenge = this.stage.challengeType === 'banks' ? this.stats.banks >= 8 : this.stats.recalls === 0;
        stars = 1 + Number(this.volley <= this.stage.par) + Number(challenge);
        if (this.stats.rewinds) stars = 1;
      }
      this.outcome = { won, stars, score: this.score, wave: this.wave, volleys: this.volley, ...this.stats };
      this.emit('result', this.outcome);
    }
    laser() {
      let x = this.launchX, y = C.LAUNCH, vx = Math.cos(this.angle), vy = Math.sin(this.angle), banks = 0;
      const points = [{ x, y }], ignore = new Set();
      for (let i = 0; i < 200; i++) {
        const hit = this.query(x, y, vx, vy, 0, 1800, ignore);
        if (!hit) break;
        x += vx * hit.t; y += vy * hit.t; points.push({ x, y });
        if (hit.kind === 'return') break;
        if (hit.kind === 'block' && hit.block.type !== 'prism') {
          ignore.add(hit.block.id); this.damageBlock(hit.block, hit.block.hp, null, 'laser');
          x += vx * 0.001; y += vy * 0.001;
        } else {
          if (banks++ >= 4) break;
          const dot = vx * hit.nx + vy * hit.ny; vx -= 2 * dot * hit.nx; vy -= 2 * dot * hit.ny;
          x += hit.nx * 0.001; y += hit.ny * 0.001;
        }
      }
      this.emit('laser', { points });
    }
    preview(segments = 4) {
      const shot = this.shotParameters(), ignore = new Set(), origin = clamp(this.launchX, shot.radius, C.W - shot.radius), points = [{ x: origin, y: C.LAUNCH }];
      let x = origin, y = C.LAUNCH, vx = Math.cos(this.angle), vy = Math.sin(this.angle), pierce = shot.pierce;
      for (let i = 0; i < segments; i++) {
        const hit = this.query(x, y, vx, vy, shot.radius, 1500, ignore);
        if (!hit) break;
        x += vx * hit.t; y += vy * hit.t;
        points.push({ x, y, kind: hit.kind, id: hit.block?.id });
        if (hit.kind === 'return') break;
        if (hit.kind === 'block' && hit.block.type !== 'prism' && pierce > 0) { ignore.add(hit.block.id); pierce--; x += vx * 0.001; y += vy * 0.001; }
        else {
          const dot = vx * hit.nx + vy * hit.ny; vx -= 2 * dot * hit.nx; vy -= 2 * dot * hit.ny;
          x += hit.nx * ((hit.depth || 0) + 0.001); y += hit.ny * ((hit.depth || 0) + 0.001);
        }
      }
      return points;
    }
    snapshot() {
      if (!['aim', 'upgrade'].includes(this.phase)) return null;
      const keys = ['mode', 'stageId', 'seed', 'rng', 'phase', 'blocks', 'nextId', 'launchX', 'angle', 'wave', 'volley', 'score', 'resonance', 'pending', 'loadout', 'stats', 'incoming', 'incomingEcho', 'offers', 'lastChoiceWave'];
      const data = { version: C.VERSION };
      for (const key of keys) data[key] = copy(this[key]);
      return data;
    }
    static restore(data) {
      validateSnapshot(data);
      const engine = new Engine({ mode: data.mode, stageId: data.stageId, seed: data.seed });
      for (const key of ['mode', 'stageId', 'seed', 'rng', 'phase', 'blocks', 'nextId', 'launchX', 'angle', 'wave', 'volley', 'score', 'resonance', 'pending', 'loadout', 'stats', 'incoming', 'incomingEcho', 'offers', 'lastChoiceWave']) engine[key] = copy(data[key]);
      engine.events = []; engine.rebuildGrid(); return engine;
    }
  }
  function validateSnapshot(s) {
    function number(n, min, max, integer = true) { return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n)); }
    function require(condition) { if (!condition) throw new Error('This checkpoint is invalid or uses different rules.'); }
    require(s && s.version === C.VERSION && ['campaign', 'daily', 'survival'].includes(s.mode) && ['aim', 'upgrade'].includes(s.phase));
    require(number(s.stageId, 0, 23) && typeof s.seed === 'string' && s.seed.length <= 80 && number(s.rng, 0, 4294967295));
    require(number(s.nextId, 1, 10000000) && number(s.wave, 1, 100000) && number(s.volley, 0, 1000000) && number(s.score, 0, 1000000000));
    require(number(s.launchX, C.R, C.W - C.R, false) && number(s.angle, -Math.PI + Math.PI / 12 - EPS, -Math.PI / 12 + EPS, false));
    require(number(s.resonance, 0, 100000) && number(s.lastChoiceWave, 0, s.wave));
    require(s.loadout && number(s.loadout.photons, 1, C.MAX) && number(s.loadout.damage, 1, 4) && number(s.loadout.bank, 0, 3) && number(s.loadout.blast, 0, 3) && number(s.loadout.reserve, 0, 2) && number(s.loadout.capacity, 3, 5));
    require(s.pending && Object.keys(freshPending()).every(k => number(s.pending[k], 0, k === 'photon' ? 160 : s.loadout.capacity)));
    require(s.stats && ['damage', 'clears', 'banks', 'recalls', 'novas', 'rewinds'].every(k => number(s.stats[k], 0, 1000000000)));
    require(Array.isArray(s.blocks) && s.blocks.length <= 164 && Array.isArray(s.incoming) && s.incoming.length <= 8 && Array.isArray(s.incomingEcho) && s.incomingEcho.length <= 8);
    const ids = new Set();
    const occupiedBlocks = new Set();
    for (const b of s.blocks) {
      require(b && number(b.id, 1, s.nextId - 1) && !ids.has(b.id)); ids.add(b.id);
      require(number(b.column, 0, 7) && number(b.row, 0, b.type === 'prism' ? 18 : 17) && number(b.hp, 1, 100) && number(b.maxHp, b.hp, 100) && b.alive === true);
      require(['normal', 'bomb', 'shield', 'core', 'prism'].includes(b.type) && (b.reward === null || isReward(b.reward)) && typeof b.flip === 'boolean');
      require(number(b.x, 0, C.W, false) && number(b.y, C.TOP, C.LAUNCH, false) && [C.CW - 2 * C.PAD, C.CW * 2 - 2 * C.PAD].includes(b.w) && b.h === C.CH - 2 * C.PAD);
      require(Math.abs(b.x - (b.column * C.CW + C.PAD)) < EPS && Math.abs(b.y - (C.TOP + b.row * C.CH + C.PAD)) < EPS && b.x + b.w <= C.W && b.y + b.h < (b.type === 'prism' ? C.LAUNCH : C.DANGER));
      for (let col = b.column; col <= b.column + (b.w > C.CW ? 1 : 0); col++) {
        const key = b.row * C.COLS + col; require(!occupiedBlocks.has(key)); occupiedBlocks.add(key);
      }
    }
    for (const row of [s.incoming, s.incomingEcho]) {
      const occupied = new Set();
      for (const cell of row) {
      require(cell && number(cell.column, 0, cell.wide ? 6 : 7) && number(cell.hp, 1, 100) && ['normal', 'bomb', 'shield', 'core'].includes(cell.type) && (cell.reward === null || isReward(cell.reward)) && (cell.wide === undefined || typeof cell.wide === 'boolean'));
      for (let col = cell.column; col <= cell.column + (cell.wide ? 1 : 0); col++) { require(!occupied.has(col)); occupied.add(col); }
      }
    }
    require(Array.isArray(s.offers) && s.offers.length <= 3 && new Set(s.offers).size === s.offers.length && s.offers.every(id => Content.upgrades.some(u => u.id === id)));
    require(s.offers.every(id => { const u = Content.upgrades.find(u => u.id === id); return id === 'swarm' ? s.loadout.photons < u.cap : id === 'power' ? s.loadout.damage < u.cap : s.loadout[id] < u.cap; }));
    require(s.phase === 'upgrade' ? s.offers.length > 0 : s.offers.length === 0);
    if (s.mode === 'campaign') require(s.wave <= Content.stages[s.stageId].waves.length);
    if (s.mode === 'campaign') require(s.incomingEcho.length === 0);
    return true;
  }
  return { C, Engine, aimAngle, sweepBox, sweepRail, railLine, circleOverlap, hashSeed, validateSnapshot, clamp };
});
