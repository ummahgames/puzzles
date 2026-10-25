(function (root) {
  'use strict';
  const { C, railLine, clamp } = root.PhotonCore;
  const Content = root.PhotonContent;
  const palettes = { ion: '#70e4f2', prism: '#b6a4ff', amber: '#ffd38a', nova: '#ff93b1' };
  const types = { normal: '#70e4f2', bomb: '#ff93b1', shield: '#ffd38a', core: '#b6a4ff', prism: '#b6a4ff' };
  function rounded(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.scale = 1; this.time = 0;
      this.particles = []; this.rings = []; this.labels = []; this.laser = null; this.flash = 0;
      this.stars = Array.from({ length: 48 }, (_, i) => ({ x: (i * 127.31 + 17) % C.W, y: (i * 73.19 + 11) % C.H, size: i % 5 ? 0.7 : 1.2 }));
      this.glows = {};
      for (const color of [...Object.values(palettes), '#edf5ff']) {
        const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
        const context = sprite.getContext('2d'), gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, color + '99'); gradient.addColorStop(0.25, color + '38'); gradient.addColorStop(1, color + '00');
        context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); this.glows[color] = sprite;
      }
    }
    resize(width, height) {
      this.scale = Math.max(0.2, Math.min(width / C.W, height / C.H));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.style.width = C.W * this.scale + 'px'; this.canvas.style.height = C.H * this.scale + 'px';
      this.canvas.width = Math.round(C.W * this.scale * dpr); this.canvas.height = Math.round(C.H * this.scale * dpr);
      this.ctx.setTransform(this.canvas.width / C.W, 0, 0, this.canvas.height / C.H, 0, 0);
      this.background = this.ctx.createLinearGradient(0, 0, C.W, C.H);
      this.background.addColorStop(0, '#080f21'); this.background.addColorStop(0.55, '#102038'); this.background.addColorStop(1, '#080f21');
    }
    clear() { this.particles = []; this.rings = []; this.labels = []; this.laser = null; this.flash = 0; }
    event(event, settings) {
      const color = types[event.crystalType || 'normal'] || '#70e4f2';
      if (event.type === 'break' && !settings.reducedMotion) {
        const tone = color;
        for (let i = 0; i < 7 && this.particles.length < 150; i++) {
          const angle = i * 2.399 + event.id, speed = 18 + i * 9;
          this.particles.push({ x: event.x + event.w / 2, y: event.y + event.h / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.55, total: 0.55, color: tone, size: 1 + i % 3 });
        }
      }
      if (event.type === 'pickup') {
        this.labels.push({ x: event.x, y: event.y, text: Content.rewards[event.kind].name, color: Content.rewards[event.kind].color, life: 1.2 });
      }
      if (event.type === 'nova') { this.labels.push({ x: event.x, y: event.y, text: 'NOVA CHARGED', color: '#ffd38a', life: 1.5 }); this.flash = settings.reducedMotion ? 0 : 0.12; }
      if (event.type === 'blast' && !settings.reducedMotion) this.rings.push({ x: event.x, y: event.y, radius: event.radius, life: 0.5, color: event.core ? '#b6a4ff' : '#ff93b1' });
      if (event.type === 'bank' && !settings.reducedMotion && this.particles.length < 150) this.particles.push({ x: event.x, y: event.y, vx: 0, vy: 0, life: 0.2, total: 0.2, color: event.charged ? '#ffd38a' : color, size: 2 });
      if (event.type === 'laser') this.laser = { points: event.points, life: 0.55 };
      this.labels = this.labels.slice(-8); this.rings = this.rings.slice(-8);
    }
    update(dt, settings) {
      this.time += dt;
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 30; p.life -= dt; }
      this.particles = this.particles.filter(p => p.life > 0);
      for (const ring of this.rings) ring.life -= dt;
      this.rings = this.rings.filter(r => r.life > 0);
      for (const text of this.labels) { if (!settings.reducedMotion) text.y -= dt * 16; text.life -= dt; }
      this.labels = this.labels.filter(t => t.life > 0);
      if (this.laser) { this.laser.life -= dt; if (this.laser.life <= 0) this.laser = null; }
      this.flash = Math.max(0, this.flash - dt);
    }
    draw(engine, settings, lowEffects = false) {
      const ctx = this.ctx, light = palettes[settings.palette] || palettes.ion;
      ctx.globalAlpha = 1; ctx.fillStyle = this.background || '#080f21'; ctx.fillRect(0, 0, C.W, C.H);
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i]; ctx.globalAlpha = settings.reducedMotion ? 0.2 : 0.16 + 0.1 * Math.sin(this.time * 0.6 + i);
        ctx.fillStyle = '#bcd1e6'; ctx.fillRect(star.x, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;
      // Incoming row lives outside the collision field and uses the same columns.
      const storm = engine.incomingEcho.length > 0;
      ctx.font = (8 / this.scale) + 'px system-ui'; ctx.fillStyle = storm ? '#ffd38a' : '#9cafc4'; ctx.textAlign = 'left'; ctx.fillText(storm ? 'SOLAR STORM INCOMING · TWO ROWS' : engine.incoming.length ? 'INCOMING AFTER THIS VOLLEY' : 'FINAL WAVE · CLEAR THE GARDEN', 10, 13);
      const incomingRows = storm ? [engine.incomingEcho, engine.incoming] : [engine.incoming];
      incomingRows.forEach((row, index) => { for (const cell of row) {
        const top = storm ? 20 + index * 16 : 22, height = storm ? 15 : 19;
        const x = cell.column * C.CW + C.PAD, width = C.CW * (cell.wide ? 2 : 1) - C.PAD * 2;
        ctx.fillStyle = '#162a3f'; rounded(ctx, x, top, width, height, 4); ctx.fill();
        ctx.strokeStyle = (cell.reward ? Content.rewards[cell.reward].color : types[cell.type]) + '70'; ctx.lineWidth = 0.8; ctx.stroke();
        const incomingFont = Math.min(22, Math.max(10, 10 / this.scale));
        ctx.fillStyle = '#b5c8da'; ctx.font = incomingFont + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(cell.reward ? Content.rewards[cell.reward].icon + ' ' + cell.hp : String(cell.hp), x + width / 2, top + height / 2 + incomingFont * 0.35);
      } });
      ctx.strokeStyle = '#263b52'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(8, 56); ctx.lineTo(C.W - 8, 56); ctx.stroke();
      const descent = engine.phase === 'settle' && !settings.reducedMotion ? clamp((engine.transition - 0.13) / 0.21, 0, 1) * C.CH * (storm ? 2 : 1) : 0;
      for (const b of engine.blocks) if (b.alive) this.block(b, b.type === 'prism' ? 0 : descent, settings);
      const danger = engine.blocks.some(b => b.alive && b.type !== 'prism' && b.y + b.h > C.DANGER - C.CH * 3);
      ctx.strokeStyle = danger ? '#ff798b' : '#715362'; ctx.lineWidth = danger ? 1.4 : 0.8; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(0, C.DANGER); ctx.lineTo(C.W, C.DANGER); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = (9 / this.scale) + 'px system-ui'; ctx.textAlign = 'right'; ctx.fillStyle = danger ? '#ff93b1' : '#b79ca6'; ctx.fillText(danger ? 'CLEAR THE LOWEST ROW' : 'DANGER LINE', C.W - 9, C.DANGER - 6);
      if (engine.phase === 'aim' && settings.assistance) {
        const points = engine.preview(5);
        ctx.lineCap = 'round';
        for (let i = 1; i < points.length; i++) {
          ctx.globalAlpha = i === 1 ? 0.8 : 0.28 / Math.sqrt(i); ctx.strokeStyle = light; ctx.lineWidth = i === 1 ? 1.2 : 1; ctx.setLineDash([3, 6]);
          ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
        }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (points[1]) { ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(points[1].x, points[1].y, 4, 0, Math.PI * 2); ctx.stroke(); }
      }
      for (const p of engine.photons) {
        if (!p.active) continue;
        if (settings.trails && !settings.reducedMotion && !lowEffects) {
          p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 6) p.trail.shift();
          ctx.strokeStyle = light; ctx.lineWidth = p.r * 0.7; ctx.lineCap = 'round';
          for (let i = 1; i < p.trail.length; i++) { ctx.globalAlpha = 0.04 + i * 0.025; ctx.beginPath(); ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y); ctx.lineTo(p.trail[i].x, p.trail[i].y); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
        if (!lowEffects) ctx.drawImage(this.glows[light], p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
        ctx.fillStyle = engine.shot?.nova ? '#ffd38a' : '#edfaff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.75, 0, Math.PI * 2); ctx.fill();
      }
      for (const ring of this.rings) { ctx.globalAlpha = ring.life; ctx.strokeStyle = ring.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius * (1 - ring.life / 0.5), 0, Math.PI * 2); ctx.stroke(); }
      for (const p of this.particles) { ctx.globalAlpha = p.life / p.total; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      if (this.laser) {
        ctx.globalAlpha = Math.min(1, this.laser.life * 2); ctx.strokeStyle = '#ffd38a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
        this.laser.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const text of this.labels) {
        ctx.globalAlpha = Math.min(1, text.life * 2); ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#080f21';
        const width = ctx.measureText(text.text).width + 14, x = clamp(text.x, width / 2 + 2, C.W - width / 2 - 2);
        rounded(ctx, x - width / 2, text.y - 15, width, 21, 5); ctx.fill(); ctx.fillStyle = text.color; ctx.fillText(text.text, x, text.y - 1);
      }
      ctx.globalAlpha = 1;
      let launcher = engine.launchX;
      if (engine.phase === 'settle') launcher += (engine.returnTarget - launcher) * (settings.reducedMotion ? 1 : clamp(engine.transition / 0.2, 0, 1));
      if (engine.firstReturn && engine.phase === 'flight') {
        ctx.strokeStyle = light + '88'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(engine.firstReturn.x, C.LAUNCH, 9, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = light; ctx.globalAlpha = 0.1; ctx.beginPath(); ctx.arc(launcher, C.LAUNCH, 21, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(launcher, C.LAUNCH, 12, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#edfaff'; ctx.beginPath(); ctx.arc(launcher, C.LAUNCH, 4, 0, Math.PI * 2); ctx.fill();
      if (engine.phase === 'aim') { ctx.strokeStyle = light; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(launcher + Math.cos(engine.angle) * 8, C.LAUNCH + Math.sin(engine.angle) * 8); ctx.lineTo(launcher + Math.cos(engine.angle) * 24, C.LAUNCH + Math.sin(engine.angle) * 24); ctx.stroke(); }
      ctx.textAlign = 'center'; ctx.font = (9 / this.scale) + 'px system-ui'; ctx.fillStyle = '#9cafc4'; ctx.fillText(engine.phase === 'aim' ? 'YOUR NEXT ANGLE' : engine.phase === 'settle' ? 'GATHERING LIGHT' : engine.phase === 'flight' && engine.elapsed > 15 ? 'AUTO RECALL SOON' : 'FOLLOW THE LIGHT', 180, 635);
      if (this.flash) { ctx.globalAlpha = this.flash * 0.3; ctx.fillStyle = '#ffd38a'; ctx.fillRect(0, 0, C.W, C.H); ctx.globalAlpha = 1; }
    }
    block(b, descent, settings) {
      const ctx = this.ctx, y = b.y + descent, color = types[b.type];
      if (b.type === 'prism') {
        const line = railLine(b); ctx.strokeStyle = '#b6a4ff30'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(line.x1, line.y1); ctx.lineTo(line.x2, line.y2); ctx.stroke();
        ctx.strokeStyle = '#cbbfff'; ctx.lineWidth = 2; ctx.stroke();
        for (const p of [[line.x1, line.y1], [line.x2, line.y2]]) { ctx.fillStyle = '#b6a4ff'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); ctx.fill(); } return;
      }
      ctx.fillStyle = b.type === 'core' ? '#29233e' : b.type === 'shield' ? '#2a2a32' : b.type === 'bomb' ? '#2c2336' : '#162b40';
      rounded(ctx, b.x, y, b.w, b.h, 4); ctx.fill();
      ctx.strokeStyle = settings.contrast ? color : color + '75'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = color + '22'; rounded(ctx, b.x + 2, y + 2, b.w - 4, Math.max(2, (b.h - 4) * b.hp / b.maxHp), 3); ctx.fill();
      if (b.type === 'shield') { ctx.strokeStyle = '#ffd38a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x + 4, y + 1); ctx.lineTo(b.x + b.w - 4, y + 1); ctx.stroke(); }
      if (b.type === 'bomb' || b.type === 'core') { ctx.strokeStyle = color + '55'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(b.x + b.w / 2, y + b.h / 2, b.type === 'core' ? 10 : 8, 0, Math.PI * 2); ctx.stroke(); }
      const font = Math.min(b.hp >= 100 ? 18 : 30, Math.max(12, 14 / this.scale));
      ctx.font = '600 ' + font + 'px system-ui'; ctx.fillStyle = '#edf5ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.hp, b.x + b.w / 2, y + b.h / 2 + 0.5); ctx.textBaseline = 'alphabetic';
      if (b.reward) {
        const reward = Content.rewards[b.reward]; ctx.fillStyle = '#0b1828'; ctx.beginPath(); ctx.arc(b.x + b.w - 2, y + 1, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = reward.color; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.font = 'bold 9px system-ui'; ctx.fillStyle = reward.color; ctx.textBaseline = 'middle'; ctx.fillText(reward.icon, b.x + b.w - 2, y + 1); ctx.textBaseline = 'alphabetic';
      }
    }
  }
  root.PhotonRenderer = Renderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
