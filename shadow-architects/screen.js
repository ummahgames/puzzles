/* Shared display controls. No storage, dependencies, or network requests. */
(function () {
  'use strict';
  const doc = document, root = doc.documentElement;
  if (doc.getElementById('ug-screen-status')) return;
  const status = doc.createElement('p');
  status.id = 'ug-screen-status';
  status.className = 'ug-screen-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  doc.body.append(status);
  const hosts = {
    photon: '.home > .brand, .page-header, .game-header',
    swipe: '.header-tools, .round-tools',
    alien: '.site-header nav',
    'dune-arcanum': '.site-header, .chamber-top',
    'find-the-animal': '.header-actions, .play-stats',
    'sleepy-creature-hotel': 'header nav'
  };
  const slug = doc.body.dataset.ugGame || doc.body.dataset.game || location.pathname.split('/').filter(Boolean).pop();
  let containers = [...doc.querySelectorAll(hosts[slug] || '.header-tools, .header-actions')];
  if (!containers.length) containers = [doc.querySelector('header') || doc.body];
  const buttons = containers.map(host => {
    host.classList.add('ug-screen-host');
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'ug-screen-toggle';
    if (host.matches?.('.chamber-top, .play-stats')) button.classList.add('ug-screen-secondary');
    button.setAttribute('data-ug-fullscreen', '');
    // Keep Space/Enter on a display control out of an arcade game's key handler.
    button.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
    });
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></svg><span class="ug-screen-label">Full screen</span>';
    host.append(button);
    return button;
  });
  // This independent exit remains available when a game's header scrolls away.
  const exit = doc.createElement('button');
  exit.type = 'button'; exit.className = 'ug-screen-exit'; exit.hidden = true;
  exit.textContent = '↙ Exit full screen';
  exit.addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
  });
  doc.body.append(exit);
  let expanded = false, busy = false, previousFocus = null;
  const nativeElement = () => doc.fullscreenElement || doc.webkitFullscreenElement;
  function announce(message) { status.textContent = message; status.classList.add('ug-screen-notice'); }
  function sync() {
    const active = Boolean(nativeElement() || expanded);
    root.classList.toggle('ug-fullscreen', active);
    root.classList.toggle('ug-expanded', expanded);
    exit.hidden = !active;
    for (const button of buttons) {
      const label = active ? 'Exit full screen' : 'Enter full screen';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('span').textContent = active ? 'Exit full screen' : 'Full screen';
    }
    // Canvas games already respond to resize; no game or progress is restarted.
    window.dispatchEvent(new Event('resize'));
  }
  async function leave() {
    if (busy) return;
    busy = true;
    try {
      if (nativeElement()) {
        const close = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (close) await close.call(doc);
      }
      expanded = false;
      status.textContent = '';
      status.classList.remove('ug-screen-notice');
    } catch (_) {
      announce('Use your browser’s exit-fullscreen control to return.');
    } finally {
      busy = false; sync();
      if (!nativeElement() && previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
    }
  }
  async function toggle() {
    if (busy) return;
    if (nativeElement() || expanded) { await leave(); return; }
    previousFocus = doc.activeElement;
    busy = true;
    try {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      const allowed = root.requestFullscreen ? doc.fullscreenEnabled !== false : doc.webkitFullscreenEnabled !== false;
      if (!request || !allowed) throw new Error('Native fullscreen unavailable');
      await request.call(root);
      expanded = !nativeElement();
    } catch (_) { expanded = true; }
    finally {
      busy = false;
      if (expanded) announce('Expanded view is on. This browser keeps its own bars visible. Tap Exit full screen to return.');
      sync();
    }
  }
  for (const button of buttons) button.addEventListener('click', toggle);
  exit.addEventListener('click', leave);
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) doc.addEventListener(type, () => {
    if (!nativeElement()) { expanded = false; status.textContent = ''; status.classList.remove('ug-screen-notice'); }
    sync();
  });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && !doc.querySelector('dialog[open]')) {
      event.preventDefault(); event.stopImmediatePropagation(); leave();
    }
  }, true);
  sync();
}());
