/* Aerio — boot */
(function (App) {
  'use strict';

  const eyebrow = App.$('#pageEyebrow');
  if (eyebrow) eyebrow.textContent = App.dateLabel();

  const sessionUser = window.Session ? window.Session.current() : null;
  if (!sessionUser) {
    // The auth gate is painted by session.js; do not open app chrome behind it.
    return;
  }

  const params = new URLSearchParams(location.search);
  const requested = params.get('view');
  const known = ['today', 'airspace', 'authorize', 'profile', 'learn'];

  let isNew = false;
  try {
    isNew = sessionStorage.getItem('altitude.newUser') === '1';
    if (isNew) sessionStorage.removeItem('altitude.newUser');
  } catch (e) { isNew = false; }

  if (isNew) {
    App.state.onboarded = true;
    App.save();
    App.go('profile');
    setTimeout(function () {
      App.toast('Welcome, ' + (sessionUser.name || 'pilot') + '. Start with your operator ID, then add a drone.');
    }, 700);
  } else {
    App.go(known.indexOf(requested) !== -1 ? requested : 'today');
  }

  if (!isNew && !App.state.onboarded && params.get('tour') !== '0') {
    setTimeout(function () { App.openOnboarding(); }, 900);
  }

  // Roll the pre-flight checklist over at midnight.
  setInterval(function () {
    if (App.state.checksDate !== App.todayISO()) {
      App.state.checks = [];
      App.state.checksDate = App.todayISO();
      App.save();
      if (App.renderToday) App.renderToday();
    }
  }, 60000);
})(window.App);
