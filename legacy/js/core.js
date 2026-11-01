/* Aerio — core: state, routing, materials, overlays, springs */
window.App = (function () {
  'use strict';

  const DATA = window.ALT_DATA;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pad = (n) => String(n).padStart(2, '0');
  const REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dateLabel() {
    const d = new Date();
    const locale = document.documentElement.lang === 'ro-RO' ? 'ro-RO' : 'en-GB';
    const weekday = d.toLocaleDateString(locale, { weekday: 'long' });
    const rest = d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    return weekday + ', ' + rest;
  }
  function nowMin() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function toMin(hhmm) {
    const p = String(hhmm || '0:0').split(':');
    return (+p[0] || 0) * 60 + (+p[1] || 0);
  }
  function humanGap(mins) {
    mins = Math.max(0, Math.round(mins));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return h + 'h ' + m + 'm';
    if (h) return h + 'h';
    return m + 'm';
  }

  /* ── Persistence ─────────────────────────────────────── */
  const SESSION_USER = window.Session ? window.Session.current() : null;
  const KEY = window.Session ? window.Session.dataKey(SESSION_USER) : 'altitude.guest.v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isDemo = !!(SESSION_USER && SESSION_USER.demo);
  const profile = Object.assign(
    isDemo ? clone(DATA.DEFAULT_PROFILE) : {
      name: (SESSION_USER && SESSION_USER.name) || '',
      email: (SESSION_USER && SESSION_USER.email) || '',
      phone: '', operatorId: '', registration: '', insurance: '', insuranceUntil: '', address: ''
    },
    saved.profile || {}
  );
  const certs = Object.assign(
    isDemo ? clone(DATA.DEFAULT_CERTS) : {
      a1a3: { have: false, date: '', ref: '' },
      a2: { have: false, date: '', ref: '' }
    },
    saved.certs || {}
  );
  const drones = Array.isArray(saved.drones) ? saved.drones : (isDemo ? clone(DATA.DEFAULT_DRONES) : []);
  const settings = Object.assign(clone(DATA.DEFAULT_SETTINGS), saved.settings || {});

  const systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const themeParam = new URLSearchParams(location.search).get('theme');
  const state = {
    view: 'today',
    theme: themeParam === 'dark' || themeParam === 'light' ? themeParam : (saved.theme === 'dark' || saved.theme === 'light' ? saved.theme : (systemDark ? 'dark' : 'light')),
    onboarded: !!saved.onboarded,
    profile: profile,
    certs: certs,
    drones: drones,
    settings: settings,
    checks: [],
    checksDate: '',
    learned: Array.isArray(saved.learned) ? saved.learned : [],
    lastAuth: saved.lastAuth || null,
    zoneId: saved.zoneId || 'park',
    flightArea: Array.isArray(saved.flightArea) ? saved.flightArea : [],
    flightRequests: Array.isArray(saved.flightRequests) ? saved.flightRequests : []
  };
  if (saved.checksDate === todayISO() && Array.isArray(saved.checks)) {
    state.checks = saved.checks;
    state.checksDate = saved.checksDate;
  }
  if (!state.checksDate) state.checksDate = todayISO();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        theme: state.theme,
        onboarded: state.onboarded,
        profile: state.profile,
        certs: state.certs,
        drones: state.drones,
        settings: state.settings,
        checks: state.checks,
        checksDate: state.checksDate,
        learned: state.learned,
        lastAuth: state.lastAuth,
        zoneId: state.zoneId,
        flightArea: state.flightArea,
        flightRequests: state.flightRequests
      }));
    } catch (e) { /* private mode — ignore */ }
  }

  /* ── Drone & certificate logic ───────────────────────── */
  function droneClass(weight) {
    const w = Number(weight) || 0;
    if (w <= 0) return '—';
    if (w < 250) return 'C0';
    if (w < 900) return 'C1';
    if (w < 4000) return 'C2';
    if (w <= 25000) return 'C3';
    return 'X';
  }
  function certRequirement(weight) {
    const c = droneClass(weight);
    if (c === 'C0' || c === 'C1') return { code: 'a1a3', label: 'A1 / A3', rule: 'A1' };
    if (c === 'C2') return { code: 'a2', label: 'A2', rule: 'A2' };
    if (c === 'C3' || c === 'C4') return { code: 'a1a3', label: 'A1 / A3', rule: 'A3' };
    return { code: null, label: 'Specific category', rule: 'Specific' };
  }
  function droneCertStatus(drone) {
    const req = certRequirement(drone ? drone.weight : 0);
    const record = req.code ? state.certs[req.code] : null;
    return {
      code: req.code,
      label: req.label,
      rule: req.rule,
      held: !!(record && record.have),
      cls: droneClass(drone ? drone.weight : 0)
    };
  }
  function droneLabel(d) { return (d && (d.nickname || d.model)) || 'Drone'; }
  function weightLabel(g) {
    const w = Number(g) || 0;
    if (w >= 1000) return (Math.round(w / 100) / 10).toString().replace('.', ',') + ' kg';
    return w + ' g';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const p = String(iso).split('-');
    if (p.length !== 3) return iso;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (+p[2]) + ' ' + (months[+p[1] - 1] || '') + ' ' + p[0];
  }
  function insuranceValid() {
    if (!state.profile || !state.profile.insuranceUntil) return false;
    return state.profile.insuranceUntil >= todayISO();
  }
  function profileCheck() {
    const p = state.profile || {};
    const items = [
      { key: 'name', label: 'Full name', ok: !!(p.name && p.name.trim()) },
      { key: 'operatorId', label: 'Operator ID', ok: !!(p.operatorId && p.operatorId.trim()) },
      { key: 'registration', label: 'CAA operator registration', ok: !!(p.registration && p.registration.trim()) },
      { key: 'insurance', label: 'Insurance on file', ok: !!(p.insurance && p.insurance.trim()) },
      { key: 'insuranceUntil', label: 'Insurance in date', ok: insuranceValid() },
      { key: 'a1a3', label: 'A1 / A3 certificate', ok: !!(state.certs.a1a3 && state.certs.a1a3.have) },
      { key: 'drones', label: 'At least one drone', ok: state.drones.length > 0 }
    ];
    if (state.drones.some((d) => certRequirement(d.weight).code === 'a2')) {
      items.push({ key: 'a2', label: 'A2 certificate', ok: !!(state.certs.a2 && state.certs.a2.have) });
    }
    const done = items.filter((i) => i.ok).length;
    return {
      pct: Math.round((done / items.length) * 100),
      done: done,
      total: items.length,
      items: items,
      missing: items.filter((i) => !i.ok)
    };
  }
  function getDrone(id) {
    for (let i = 0; i < state.drones.length; i++) if (state.drones[i].id === id) return state.drones[i];
    return null;
  }
  function newId(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ── Theme ───────────────────────────────────────────── */
  const metaTheme = $('meta[name="theme-color"]');
  function applyTheme(t, persist) {
    state.theme = t === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    const romanian = document.documentElement.lang === 'ro-RO';
    $$('.theme-toggle .theme-label').forEach(function (themeLabel) {
      themeLabel.textContent = state.theme === 'dark'
        ? (romanian ? 'Temă albă' : 'White theme')
        : (romanian ? 'Temă întunecată' : 'Dark theme');
    });
    if (metaTheme) metaTheme.setAttribute('content', state.theme === 'dark' ? '#060a12' : '#eef2f8');
    if (persist) save();
  }
  applyTheme(state.theme, false);

  /* ── Router ──────────────────────────────────────────── */
  const VIEWS = {
    today: { title: 'Today', titleRo: 'Astăzi', eyebrow: null },
    airspace: { title: 'Airspace', titleRo: 'Spațiu aerian', eyebrow: 'ROMATSA snapshot · example traffic', eyebrowRo: 'Instantaneu ROMATSA · trafic demonstrativ' },
    authorize: { title: 'Flight request', titleRo: 'Cerere de zbor', eyebrow: 'Local planning · not submitted', eyebrowRo: 'Planificare locală · nedepusă' },
    profile: { title: 'Profile', titleRo: 'Profil', eyebrow: 'Operator · certificates · drones', eyebrowRo: 'Operator · certificate · drone' },
    learn: { title: 'Learn', titleRo: 'Ghid', eyebrow: 'Beginner path · A1 / A3', eyebrowRo: 'Ghid pentru începători · A1 / A3' }
  };
  const viewHooks = {};

  function go(view) {
    if (view === 'map') view = 'airspace';
    if (view === 'gear') view = 'profile';
    if (!VIEWS[view]) view = 'today';
    state.view = view;
    $$('.view').forEach((el) => {
      const on = el.dataset.view === view;
      el.hidden = !on;
      if (on) {
        el.classList.remove('is-entering');
        void el.offsetWidth;
        el.classList.add('is-entering');
        el.addEventListener('animationend', function () { el.classList.remove('is-entering'); }, { once: true });
      }
    });
    $$('.nav-item, .tab').forEach((b) => b.classList.toggle('is-active', b.dataset.go === view));
    const t = $('#pageTitle');
    const romanian = document.documentElement.lang === 'ro-RO';
    if (t) t.textContent = romanian ? VIEWS[view].titleRo : VIEWS[view].title;
    const e = $('#pageEyebrow');
    if (e) e.textContent = (romanian ? VIEWS[view].eyebrowRo : VIEWS[view].eyebrow) || dateLabel();
    const content = $('#content');
    if (content) {
      if (window.innerWidth <= 1024) window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
      else content.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
    }
    if (viewHooks[view]) viewHooks[view].forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }
  function onView(view, fn) {
    if (!viewHooks[view]) viewHooks[view] = [];
    viewHooks[view].push(fn);
  }

  /* ── Toast ───────────────────────────────────────────── */
  const toastHost = $('#toasts');
  function toast(message, kind) {
    if (!toastHost) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (kind === 'info'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 8h.01M12 11v5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>')
      + '<span>' + esc(message) + '</span>';
    toastHost.appendChild(t);
    setTimeout(() => {
      t.classList.add('is-out');
      setTimeout(() => t.remove(), 240);
    }, 2700);
  }

  /* ── Overlay / sheet ─────────────────────────────────── */
  const sheetOverlay = $('#sheetOverlay');
  let sheetLastFocus = null;

  function lockScroll(on) {
    document.body.classList.toggle('no-scroll', on);
    const anyOpen = !$('#sheetOverlay').hidden || !$('#onboarding').hidden;
    document.body.classList.toggle('no-scroll', anyOpen);
  }

  function openSheet(opts) {
    if (!sheetOverlay) return;
    sheetLastFocus = document.activeElement;
    $('#sheetKicker').textContent = opts.kicker || 'Aerio';
    $('#sheetTitle').textContent = opts.title || '';
    $('#sheetBody').innerHTML = opts.body || '';
    const foot = $('#sheetFoot');
    foot.innerHTML = '';
    (opts.actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.primary ? 'btn-primary' : a.quiet ? 'btn-quiet' : 'btn-ghost');
      b.textContent = a.label;
      b.addEventListener('click', () => { if (a.onClick) a.onClick(); });
      foot.appendChild(b);
    });
    sheetOverlay.hidden = false;
    lockScroll(true);
    $('#sheetBody').scrollTop = 0;
    setTimeout(() => { const c = $('#sheetClose'); if (c) c.focus(); }, 30);
  }
  function closeSheet() {
    if (!sheetOverlay || sheetOverlay.hidden) return;
    sheetOverlay.hidden = true;
    lockScroll(false);
    if (sheetLastFocus && sheetLastFocus.focus) sheetLastFocus.focus();
  }

  if (sheetOverlay) {
    $('#sheetClose').addEventListener('click', closeSheet);
    sheetOverlay.addEventListener('click', (e) => { if (e.target === sheetOverlay) closeSheet(); });
  }

  /* ── Onboarding ──────────────────────────────────────── */
  const ob = $('#onboarding');
  let obStep = 0;
  const ART = [
    `<svg viewBox="0 0 440 140" fill="none" aria-hidden="true">
      <rect width="440" height="140" fill="url(#obg0)"/>
      <path d="M-20 112C70 96 118 54 202 62s130 46 260 14" stroke="#0A84FF" stroke-opacity=".35" stroke-width="2" stroke-dasharray="5 5"/>
      <circle cx="206" cy="66" r="26" fill="#0A84FF" fill-opacity=".12"/>
      <circle cx="206" cy="66" r="13" fill="#0A84FF" fill-opacity=".2"/>
      <circle cx="206" cy="66" r="5.5" fill="#0A84FF" stroke="#fff" stroke-width="2.5"/>
      <g transform="translate(322 36)">
        <rect width="74" height="46" rx="12" fill="#fff" fill-opacity=".55" stroke="#fff"/>
        <path d="M14 30 24 15l7 9 6-5 9 11" stroke="#0A84FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="translate(50 40)">
        <circle r="9" fill="#fff" fill-opacity=".65"/><circle r="3" fill="#1FAE52"/>
      </g>
      <defs><linearGradient id="obg0" x1="0" y1="0" x2="440" y2="140"><stop stop-color="#E8F1FF"/><stop offset="1" stop-color="#F1ECFF"/></linearGradient></defs>
    </svg>`,
    `<svg viewBox="0 0 440 140" fill="none" aria-hidden="true">
      <rect width="440" height="140" fill="url(#obg1)"/>
      <g transform="translate(370 26)">
        <rect width="54" height="88" rx="10" fill="#fff" fill-opacity=".55" stroke="#fff"/>
        <rect x="10" y="16" width="34" height="5" rx="2.5" fill="#0A84FF" fill-opacity=".35"/>
        <rect x="10" y="28" width="26" height="5" rx="2.5" fill="#0A84FF" fill-opacity=".25"/>
        <rect x="10" y="40" width="30" height="5" rx="2.5" fill="#0A84FF" fill-opacity=".25"/>
      </g>
      <g transform="translate(148 18)">
        <path d="M32 2 60 14v24c0 17-12 30-28 36C16 68 4 55 4 38V14L32 2Z" fill="#fff" fill-opacity=".8" stroke="#fff" stroke-width="2"/>
        <path d="m19 36 9 9 17-19" stroke="#0A84FF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="translate(70 40)">
        <circle r="7" fill="#1FAE52" fill-opacity=".9"/>
        <circle cx="0" cy="0" r="16" fill="none" stroke="#1FAE52" stroke-opacity=".35" stroke-width="1.5"/>
      </g>
      <defs><linearGradient id="obg1" x1="0" y1="0" x2="440" y2="140"><stop stop-color="#EAF6EF"/><stop offset="1" stop-color="#E9F1FF"/></linearGradient></defs>
    </svg>`,
    `<svg viewBox="0 0 440 140" fill="none" aria-hidden="true">
      <rect width="440" height="140" fill="url(#obg2)"/>
      <g transform="translate(140 22)">
        <path d="M0 44 156 6l-30 84-36-36-24 22-4-30L0 44Z" fill="#fff" fill-opacity=".85" stroke="#fff" stroke-width="2"/>
        <path d="M62 50 156 6l-38 48" stroke="#0A84FF" stroke-width="2.4" stroke-linejoin="round"/>
      </g>
      <g transform="translate(86 30)" fill="#7D5CFF" fill-opacity=".8">
        <path d="M0 10 3 3l7-3-7-3L0-10l-3 7-7 3 7 3 3 7Z"/>
      </g>
      <g transform="translate(366 92)" fill="#0A84FF" fill-opacity=".6">
        <path d="M0 8 2.4 2.4 8 0 2.4-2.4 0-8l-2.4 5.6L-8 0l5.6 2.4L0 8Z"/>
      </g>
      <defs><linearGradient id="obg2" x1="0" y1="0" x2="440" y2="140"><stop stop-color="#F0ECFF"/><stop offset="1" stop-color="#E7F6FF"/></linearGradient></defs>
    </svg>`
  ];

  function renderOnboard() {
    const s = DATA.ONBOARD[obStep] || DATA.ONBOARD[0];
    $('#obVisual').innerHTML = ART[obStep] || ART[0];
    $('#obStep').textContent = 'Step ' + (obStep + 1) + ' of ' + DATA.ONBOARD.length;
    $('#obTitle').textContent = s.title;
    $('#obCopy').textContent = s.copy;
    $('#obNext').textContent = s.next;
    $('#obDots').innerHTML = DATA.ONBOARD.map((_, i) => '<i class="' + (i === obStep ? 'is-on' : '') + '"></i>').join('');
  }
  function openOnboarding() {
    if (!ob) return;
    obStep = 0;
    renderOnboard();
    ob.hidden = false;
    lockScroll(true);
    setTimeout(() => { const b = $('#obNext'); if (b) b.focus(); }, 40);
  }
  function closeOnboarding() {
    if (!ob) return;
    ob.hidden = true;
    lockScroll(false);
    if (!state.onboarded) { state.onboarded = true; save(); }
  }
  if (ob) {
    $('#obNext').addEventListener('click', () => {
      if (obStep < DATA.ONBOARD.length - 1) { obStep++; renderOnboard(); }
      else { closeOnboarding(); toast('Welcome aboard. Your first window opens at 13:00.'); }
    });
    $('#obSkip').addEventListener('click', closeOnboarding);
    ob.addEventListener('click', (e) => { if (e.target === ob) closeOnboarding(); });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (ob && !ob.hidden) { closeOnboarding(); return; }
    if (sheetOverlay && !sheetOverlay.hidden) closeSheet();
  });

  /* ── Chrome wiring ───────────────────────────────────── */
  $$('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark', true);
      toast(state.theme === 'dark' ? 'Dark appearance on' : 'Light appearance on', 'info');
    });
  });
  const tourBtn = $('#tourBtn');
  if (tourBtn) tourBtn.addEventListener('click', openOnboarding);

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-go]');
    if (!trigger) return;
    const view = trigger.getAttribute('data-go');
    if (!view) return;
    e.preventDefault();
    go(view);
  });

  /* ── Physics helpers ─────────────────────────────────── */
  function rubberband(over, dim, c) {
    dim = dim || 320;
    c = c == null ? 0.55 : c;
    return (over * dim * c) / (dim + c * Math.abs(over));
  }

  function animateSprings(from, to, opts) {
    opts = opts || {};
    const damping = opts.damping == null ? 1 : opts.damping;
    const response = opts.response == null ? 0.4 : opts.response;
    const velocity = opts.velocity || {};
    const onUpdate = opts.onUpdate || function () {};
    const onDone = opts.onDone;
    const k = Math.pow((2 * Math.PI) / response, 2);
    const c = 4 * Math.PI * damping / response;
    const keys = Object.keys(from);
    const x = {};
    const v = {};
    keys.forEach((key) => { x[key] = from[key]; v[key] = velocity[key] || 0; });

    if (REDUCE) { onUpdate(Object.assign({}, to)); if (onDone) onDone(); return { stop: function () {} }; }

    let raf = 0;
    let stopped = false;
    let last = performance.now();
    function frame(now) {
      if (stopped) return;
      let dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let done = true;
      keys.forEach((key) => {
        const a = -k * (x[key] - to[key]) - c * v[key];
        v[key] += a * dt;
        x[key] += v[key] * dt;
        if (Math.abs(v[key]) > 0.5 || Math.abs(x[key] - to[key]) > 0.25) done = false;
      });
      onUpdate(Object.assign({}, x));
      if (done) {
        stopped = true;
        onUpdate(Object.assign({}, to));
        if (onDone) onDone();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      stop: function () { stopped = true; cancelAnimationFrame(raf); },
      value: function () { return Object.assign({}, x); }
    };
  }

  function getZone(id) {
    for (let i = 0; i < DATA.ZONES.length; i++) if (DATA.ZONES[i].id === id) return DATA.ZONES[i];
    return DATA.ZONES[0];
  }

  return {
    $: $, $$: $$, esc: esc, clamp: clamp, REDUCE: REDUCE,
    DATA: DATA, state: state, save: save, applyTheme: applyTheme,
    go: go, onView: onView, toast: toast,
    openSheet: openSheet, closeSheet: closeSheet,
    openOnboarding: openOnboarding,
    rubberband: rubberband, animateSprings: animateSprings,
    todayISO: todayISO, dateLabel: dateLabel, nowMin: nowMin, toMin: toMin, humanGap: humanGap,
    getZone: getZone,
    user: SESSION_USER, profileCheck: profileCheck, insuranceValid: insuranceValid,
    droneClass: droneClass, certRequirement: certRequirement, droneCertStatus: droneCertStatus,
    droneLabel: droneLabel, weightLabel: weightLabel, fmtDate: fmtDate,
    getDrone: getDrone, newId: newId
  };
})();
