// Minimal DOM/canvas contract for exercising shell code without a browser.
// It intentionally performs no layout, screenshots, networking, or UI automation.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const directory = path.resolve(__dirname, '..');
function boot(options = {}) {
  const nodes = new Map(), calls = [], memory = options.memory || new Map();
  let document, frame, now = 0;
  const context2d = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: text => ({ width: String(text).length * 6 }) }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  class Element {
    constructor(tag = 'div', attributes = '') {
      this.tagName = tag.toUpperCase(); this.listeners = {}; this.style = {}; this.dataset = {}; this.attributes = {}; this.children = []; this.hidden = /\bhidden\b/.test(attributes); this.disabled = /\bdisabled\b/.test(attributes); this.value = ''; this.type = ''; this.open = false; this.width = 360; this.height = 640; this.textContent = ''; this.parent = null;
      const classes = new Set(); this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, on) => on === undefined ? classes.has(c) ? classes.delete(c) : classes.add(c) : on ? classes.add(c) : classes.delete(c), contains: c => classes.has(c) };
      for (const match of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) this.setAttribute(match[1], match[2]);
      if (this.id) nodes.set(this.id, this);
    }
    setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') this.id = value; if (key === 'type') this.type = value; if (key === 'open') this.open = true; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value; }
    getAttribute(key) { return this.attributes[key]; }
    addEventListener(kind, callback) { (this.listeners[kind] ||= []).push(callback); }
    dispatch(kind, event = {}) { event.target ||= this; event.preventDefault ||= () => { event.defaultPrevented = true; }; for (const callback of this.listeners[kind] || []) callback(event); return event; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getContext() { return context2d; }
    getBoundingClientRect() { return { left: 0, top: 0, width: parseFloat(this.style.width) || 360, height: parseFloat(this.style.height) || 640 }; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    click() { calls.push({ action: 'click', element: this }); this.dispatch('click'); }
    appendChild(child) { this.children.push(child); child.parent = this; return child; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
    select() {}
    closest(selector) {
      const match = selector.match(/^\[data-([\w-]+)\]$/);
      if (match && this.dataset[match[1]]) return this;
      return this.parent?.closest(selector) || null;
    }
    set innerHTML(html) { this.html = html; this.children = parse(html); for (const child of this.children) child.parent = this; }
    get innerHTML() { return this.html || ''; }
    querySelector(selector) {
      if (selector === '[autofocus]') return this.children.find(n => n.autofocus) || null;
      const tags = selector.split(',').map(s => s.trim().toUpperCase());
      return this.children.find(n => tags.includes(n.tagName)) || null;
    }
  }
  function parse(html) {
    return Array.from(html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi), match => { const n = new Element(match[1], match[2]); n.autofocus = /\bautofocus\b/.test(match[2]); return n; });
  }
  parse(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'));
  document = { activeElement: null, hidden: false, body: new Element('body'), listeners: {},
    getElementById(id) { if (!nodes.has(id)) throw new Error('Missing DOM ID: ' + id); return nodes.get(id); },
    createElement: tag => new Element(tag),
    addEventListener(kind, callback) { (this.listeners[kind] ||= []).push(callback); },
  };
  const storage = options.unavailable ? { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } : { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  const windowListeners = {};
  const sandbox = { document, console, performance: { now: () => now }, navigator: { clipboard: { async writeText(text) { calls.push({ action: 'clipboard', text }); } } }, localStorage: storage, devicePixelRatio: 2, matchMedia: () => ({ matches: !!options.reducedMotion }), crypto: { getRandomValues: array => { array[0] = 42; return array; } },
    requestAnimationFrame(callback) { frame = callback; }, setTimeout(callback) { callback(); }, Blob, URL: { createObjectURL() { return 'blob:local'; }, revokeObjectURL() {} },
    addEventListener(kind, callback) { (windowListeners[kind] ||= []).push(callback); },
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of ['content.js', 'core.js', 'storage.js', 'render.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(directory, file), 'utf8'), context, { filename: file });
  function action(name) { const target = new Element('button'); target.dataset.action = name; nodes.get('modalBody').dispatch('click', { target }); }
  function click(id) { nodes.get(id).dispatch('click'); }
  function frames(count = 1) { for (let n = 0; n < count; n++) { now += 1000 / 60; frame(now); } }
  function dispatchDocument(kind, event = {}) { event.preventDefault ||= () => {}; for (const callback of document.listeners[kind] || []) callback(event); }
  return { nodes, context, memory, calls, action, click, frames, dispatchDocument, windowListeners,
    stage(id) { const target = new Element('button'); target.dataset.stage = String(id); nodes.get('chapterList').dispatch('click', { target }); },
    pointer(kind, values = {}) { nodes.get('game').dispatch(kind, { pointerId: 1, pointerType: 'touch', clientX: 180, clientY: 300, button: 0, ...values }); },
    profile() { const text = memory.get('photon.journey.v2'); return text ? JSON.parse(text) : null; },
  };
}
module.exports = { boot };
