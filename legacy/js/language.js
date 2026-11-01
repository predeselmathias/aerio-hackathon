/* Aerio — compact interface language toggle */
(function (App) {
  'use strict';

  const TEXT = {
    '.nav-item[data-go="today"] span': 'Astăzi',
    '.nav-item[data-go="airspace"] span': 'Hartă',
    '.nav-item[data-go="authorize"] > span:first-of-type': 'Cerere zbor',
    '.nav-item[data-go="profile"] span': 'Profil',
    '.nav-item[data-go="learn"] span': 'Ghid',
    '.tab[data-go="today"] span': 'Astăzi',
    '.tab[data-go="airspace"] span': 'Hartă',
    '.tab[data-go="authorize"] span': 'Cerere',
    '.tab[data-go="profile"] span': 'Profil',
    '.tab[data-go="learn"] span': 'Ghid',
    '.note-kicker': 'Astăzi în București',
    '.note-weather span': 'Senin',
    '.note-meta': 'Date demonstrative · planificare locală',
    '#tourBtn': 'Tur ghidat',
    '#airspacePill': 'Demo · nu este autorizare',
    '.seg[data-layer="romatsa"]': 'Zone ROMATSA',
    '.seg[data-layer="satellite"]': 'Imagine aeriană',
    '.seg[data-layer="airspace"]': 'Zone demo',
    '.seg[data-layer="traffic"]': 'Trafic',
    '.map-source-link': 'MAPN AEROFOTO ↗',
    '.opacity-control span': 'Opacitate imagine',
    '.map-legend span:nth-child(1)': 'Demo deschis',
    '.map-legend span:nth-child(2)': 'Atenționare',
    '.map-legend span:nth-child(3)': 'Restricționat',
    '.zone-list-card .card-title': 'Zone demo din București',
    '.zone-list-card .card-sub': 'Doar ilustrative · selectează pentru detalii',
    '.page-foot span:first-child': 'Aerio · prototip hackathon',
    '.page-foot span:last-child': 'Datele ROMATSA sunt un instantaneu; verifică NOTAM-urile și autorizațiile la sursele oficiale.'
  };
  const ORIGINAL_TEXT = {};
  const languageButton = App.$('#languageBtn');

  function getLabel(element) {
    for (let i = 0; i < element.childNodes.length; i++) {
      if (element.childNodes[i].nodeType === 3 && element.childNodes[i].nodeValue.trim()) {
        return element.childNodes[i].nodeValue.trim();
      }
    }
    return element.textContent;
  }

  function setLabel(element, value) {
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 3 && child.nodeValue.trim()) {
        child.nodeValue = child.nodeValue.replace(child.nodeValue.trim(), value);
        return;
      }
    }
    element.textContent = value;
  }

  function applyLanguage(language) {
    const lang = language === 'ro' ? 'ro' : 'en';
    App.state.settings.language = lang;
    document.documentElement.lang = lang === 'ro' ? 'ro-RO' : 'en-GB';

    Object.keys(TEXT).forEach(function (selector) {
      const element = App.$(selector);
      if (!element) return;
      if (ORIGINAL_TEXT[selector] == null) ORIGINAL_TEXT[selector] = getLabel(element);
      setLabel(element, lang === 'ro' ? TEXT[selector] : ORIGINAL_TEXT[selector]);
    });

    if (languageButton) {
      languageButton.textContent = lang === 'ro' ? 'EN' : 'RO';
      languageButton.setAttribute('aria-label', lang === 'ro' ? 'Switch to English' : 'Schimbă limba în română');
      languageButton.title = lang === 'ro' ? 'Switch to English' : 'Schimbă limba în română';
    }

    App.applyTheme(App.state.theme, false);
    App.save();
    App.go(App.state.view);
    window.dispatchEvent(new CustomEvent('altitude:language', { detail: { language: lang } }));
  }

  if (languageButton) {
    languageButton.addEventListener('click', function () {
      applyLanguage(App.state.settings.language === 'ro' ? 'en' : 'ro');
    });
  }

  applyLanguage(App.state.settings.language);
})(window.App);
