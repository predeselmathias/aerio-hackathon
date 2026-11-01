/* Aerio — local accounts: sign up, sign in, demo session */
(function () {
  'use strict';

  const USERS_KEY = 'altitude.users.v1';
  const SESSION_KEY = 'altitude.session.v1';
  const DEMO_EMAIL = 'alex@aerio.app';
  const DEMO_PASS = 'altitude';

  const readUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') || []; } catch (e) { return []; }
  };
  const writeUsers = (users) => {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) { /* ignore */ }
  };
  const norm = (s) => String(s || '').trim().toLowerCase();
  const uid = () => 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function ensureDemo() {
    const users = readUsers();
    let demo = users.filter((u) => u.demo)[0];
    if (!demo) {
      demo = {
        id: 'u_demo',
        name: 'Alex Ionescu',
        email: DEMO_EMAIL,
        demo: true,
        salt: 'demo-salt',
        hash: '',
        createdAt: new Date().toISOString()
      };
      users.push(demo);
      writeUsers(users);
    } else if (norm(demo.email) !== DEMO_EMAIL) {
      demo.email = DEMO_EMAIL;
      writeUsers(users);
    }
    return demo;
  }

  function current() {
    let id = '';
    try { id = localStorage.getItem(SESSION_KEY) || ''; } catch (e) { id = ''; }
    if (!id) return null;
    const user = readUsers().filter((u) => u.id === id)[0] || null;
    if (!user) {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      return null;
    }
    return user;
  }

  function userByEmail(email) {
    const e = norm(email);
    return readUsers().filter((u) => norm(u.email) === e)[0] || null;
  }

  async function digest(text) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.prototype.map.call(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Very small fallback for non-secure contexts.
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'fb' + (h >>> 0).toString(16);
  }

  function salt() {
    if (window.crypto && window.crypto.getRandomValues) {
      const a = new Uint8Array(12);
      window.crypto.getRandomValues(a);
      return Array.prototype.map.call(a, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function setSession(id) {
    try { localStorage.setItem(SESSION_KEY, id); } catch (e) { /* ignore */ }
  }

  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    location.reload();
  }

  async function signUp(name, email, password) {
    name = String(name || '').trim();
    email = norm(email);
    if (name.length < 2) throw new Error('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (String(password || '').length < 8) throw new Error('Use at least 8 characters for the password.');
    if (userByEmail(email)) throw new Error('An account with this email already exists.');
    const s = salt();
    const u = {
      id: uid(),
      name: name,
      email: email,
      salt: s,
      hash: await digest(s + ':' + password),
      createdAt: new Date().toISOString(),
      demo: false
    };
    const users = readUsers();
    users.push(u);
    writeUsers(users);
    setSession(u.id);
    try { sessionStorage.setItem('altitude.newUser', '1'); } catch (e) { /* ignore */ }
    location.reload();
  }

  async function signIn(email, password) {
    const submittedEmail = norm(email);
    const u = userByEmail(submittedEmail) ||
      (submittedEmail === 'alex@altitude.app' ? userByEmail(DEMO_EMAIL) : null);
    if (!u) throw new Error('No account found with that email.');
    if (u.demo) {
      if (String(password || '') !== DEMO_PASS) throw new Error('Demo password is “altitude”.');
    } else {
      const h = await digest(u.salt + ':' + password);
      if (h !== u.hash) throw new Error('That password does not match.');
    }
    setSession(u.id);
    try { sessionStorage.removeItem('altitude.newUser'); } catch (e) { /* ignore */ }
    location.reload();
  }

  function signInDemo() {
    const demo = ensureDemo();
    setSession(demo.id);
    try { sessionStorage.removeItem('altitude.newUser'); } catch (e) { /* ignore */ }
    location.reload();
  }

  /* ── Auth screen ───────────────────────────────────────── */
  function paint() {
    const screen = document.getElementById('authScreen');
    const authed = !!current();
    document.body.classList.toggle('is-guest', !authed);
    if (screen) screen.hidden = authed;
    if (!authed) ensureDemo();
    return authed;
  }

  function wire() {
    const screen = document.getElementById('authScreen');
    if (!screen) return;

    const tabs = Array.prototype.slice.call(screen.querySelectorAll('[data-auth-tab]'));
    const forms = {
      signin: document.getElementById('signinForm'),
      signup: document.getElementById('signupForm')
    };
    const errors = {
      signin: document.getElementById('signinError'),
      signup: document.getElementById('signupError')
    };

    function showTab(name) {
      tabs.forEach((b) => {
        const on = b.getAttribute('data-auth-tab') === name;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      Object.keys(forms).forEach((k) => { if (forms[k]) forms[k].hidden = k !== name; });
      const active = forms[name];
      if (active) {
        const f = active.querySelector('input');
        if (f) setTimeout(function () { f.focus(); }, 40);
      }
    }
    tabs.forEach((b) => b.addEventListener('click', function () { showTab(b.getAttribute('data-auth-tab')); }));

    function showError(which, message) {
      const el = errors[which];
      if (!el) return;
      el.hidden = !message;
      el.textContent = message || '';
    }

    const signin = forms.signin;
    if (signin) {
      signin.addEventListener('submit', async function (e) {
        e.preventDefault();
        showError('signin', '');
        const btn = signin.querySelector('button[type="submit"]');
        const old = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Signing in…';
        try {
          await signIn(signin.elements.email.value, signin.elements.password.value);
        } catch (err) {
          showError('signin', err.message);
          btn.disabled = false;
          btn.textContent = old;
        }
      });
    }

    const signup = forms.signup;
    if (signup) {
      signup.addEventListener('submit', async function (e) {
        e.preventDefault();
        showError('signup', '');
        const btn = signup.querySelector('button[type="submit"]');
        const old = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Creating account…';
        try {
          await signUp(signup.elements.name.value, signup.elements.email.value, signup.elements.password.value);
        } catch (err) {
          showError('signup', err.message);
          btn.disabled = false;
          btn.textContent = old;
        }
      });
    }

    const demo = document.getElementById('demoLogin');
    if (demo) demo.addEventListener('click', signInDemo);

    const demo2 = document.getElementById('demoLogin2');
    if (demo2) demo2.addEventListener('click', signInDemo);
  }

  paint();
  wire();

  window.Session = {
    current: current,
    ensureDemo: ensureDemo,
    signIn: signIn,
    signUp: signUp,
    signInDemo: signInDemo,
    signOut: signOut,
    paint: paint,
    dataKey: function (u) { return u ? 'altitude.data.' + u.id : 'altitude.guest.v1'; }
  };
})();
