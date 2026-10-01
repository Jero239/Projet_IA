const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sources = Object.fromEntries(['donnees-site.js', 'contenu-modele.js', 'contenu-site.js'].map((name) => [
  name, fs.readFileSync(path.join(__dirname, '..', 'js', name), 'utf8')
]));

// Ce DOM minimal mémorise les écritures réelles du runtime sans reproduire
// le calcul des dates, les sélections de contenu ou les fonctions de rendu.
class Element {
  constructor(text = 'Contenu statique conservé') {
    this._html = text;
    this._text = text;
    this.attributes = new Map();
    this.hidden = false;
    this.htmlWrites = 0;
  }
  get innerHTML() { return this._html; }
  set innerHTML(value) { this._html = value; this.htmlWrites += 1; }
  get textContent() { return this._text; }
  set textContent(value) { this._text = value; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}

function eventTarget() {
  const listeners = new Map();
  return {
    events: [],
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    dispatchEvent(event) {
      this.events.push(event.type);
      (listeners.get(event.type) || []).forEach((listener) => listener.call(this, event));
      return true;
    }
  };
}

function runPage({ now = '2026-10-01T12:00:00Z', modify = () => {}, omit = null, emptyPage = false } = {}) {
  let currentTime = now;
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [currentTime])); }
    static now() { return new Date(currentTime).getTime(); }
  }
  const elements = {
    creme: new Element(), tomate: new Element(),
    days: new Element(), summary: new Element(), calls: new Element(), callStart: new Element(),
    phone: new Element('Commander'), phoneNumber: new Element(),
    email: new Element(), emailText: new Element(),
    today: new Element(), schedule: new Element(), announcements: new Element()
  };
  const selectors = new Map([
    ['[data-pizza-list="creme"]', [elements.creme]],
    ['[data-pizza-list="tomate"]', [elements.tomate]],
    ['[data-service-days]', [elements.days]],
    ['[data-service-summary]', [elements.summary]],
    ['[data-call-summary]', [elements.calls]],
    ['[data-call-start]', [elements.callStart]],
    ['[data-phone]', [elements.phone, elements.phoneNumber]],
    ['[data-phone-text]', [elements.phoneNumber]],
    ['[data-email]', [elements.email]],
    ['[data-email-text]', [elements.emailText]],
    ['[data-today]', [elements.today]],
    ['[data-schedule]', [elements.schedule]],
    ['[data-announcements]', [elements.announcements]]
  ]);
  const document = Object.assign(eventTarget(), {
    hidden: false,
    querySelectorAll(selector) { return emptyPage ? [] : (selectors.get(selector) || []); }
  });
  const timers = [];
  const errors = [];
  const sandbox = Object.assign(eventTarget(), {
    document, Date: Clock, Intl,
    CustomEvent: class { constructor(type) { this.type = type; } },
    console: { error: (...args) => errors.push(args) },
    setInterval(callback, delay) { timers.push({ callback, delay }); return timers.length; }
  });
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  if (omit !== 'GalloisData') vm.runInContext(sources['donnees-site.js'], context, { filename: 'donnees-site.js' });
  if (omit !== 'GalloisModel') vm.runInContext(sources['contenu-modele.js'], context, { filename: 'contenu-modele.js' });
  if (context.GalloisData) modify(context.GalloisData);
  vm.runInContext(sources['contenu-site.js'], context, { filename: 'contenu-site.js' });
  return {
    elements, document, timers, errors, context,
    setTime(value) { currentTime = value; },
    tick() { timers.forEach(({ callback }) => callback()); },
    pageshow() { sandbox.dispatchEvent({ type: 'pageshow' }); },
    visibility(hidden) { document.hidden = hidden; document.dispatchEvent({ type: 'visibilitychange' }); }
  };
}

function closure(debut = '2026-10-01', fin = '2026-10-01') {
  return {
    id: 'fermeture-test', active: true, type: 'fermeture',
    titre: 'Fermeture du camion', message: 'Rendez-vous demain.',
    debut, fin, remplacement: null
  };
}

test('les coordonnées, prix et disponibilités sont branchés sur les données centrales', () => {
  const page = runPage({ modify(data) {
    data.contact = { telephone: '07 11 22 33 44', telephoneLien: '+33711223344', email: 'wayne@example.fr' };
    data.debutAppels = '15:30';
    data.pizzas[0].nom = 'La pizza de test';
    data.pizzas[0].ingredients = ['Crème', 'Poireaux'];
    data.pizzas[0].prix = 13.50;
    data.pizzas[0].disponible = false;
    data.semaine[5].ouvert = false;
  } });
  const { elements } = page;
  assert.equal(elements.phone.getAttribute('href'), 'tel:+33711223344');
  assert.equal(elements.phoneNumber.getAttribute('href'), 'tel:+33711223344');
  assert.equal(elements.phoneNumber.textContent, '07 11 22 33 44');
  assert.equal(elements.phone.textContent, 'Commander');
  assert.equal(elements.email.getAttribute('href'), 'mailto:wayne@example.fr');
  assert.equal(elements.email.textContent, 'wayne@example.fr');
  assert.equal(elements.emailText.textContent, 'wayne@example.fr');
  assert.equal(elements.days.textContent, 'Du lundi au vendredi');
  assert.equal(elements.summary.textContent, 'Du lundi au vendredi · à partir de 18h00');
  assert.equal(elements.calls.textContent, 'Du lundi au vendredi · appels dès 15h30');
  assert.equal(elements.callStart.textContent, '15h30');
  assert.match(elements.creme.innerHTML, /La pizza de test/);
  assert.match(elements.creme.innerHTML, /Crème, Poireaux/);
  assert.match(elements.creme.innerHTML, /13,50\s€/);
  assert.match(elements.creme.innerHTML, /Temporairement indisponible/);
  assert.doesNotMatch(elements.creme.innerHTML, /<img/);
  assert.match(elements.tomate.innerHTML, /La Margherita/);
  assert.doesNotMatch(elements.tomate.innerHTML, /La pizza de test/);
  assert.deepEqual(page.document.events, ['gallois:content-updated']);
  assert.equal(page.errors.length, 0);
});

test('le résumé du jour conserve son HTML et échappe seulement les textes éditables', () => {
  const page = runPage({ modify(data) {
    data.semaine[3].ville = 'Place <img src=x onerror=alert(1)> & marché';
  } });
  const html = page.elements.today.innerHTML;
  assert.match(html, /<strong>Place &lt;img src=x onerror=alert\(1\)&gt; &amp; marché/);
  assert.doesNotMatch(html, /<img|&lt;strong&gt;|&amp;lt;img/);
  assert.match(html, /service prévu/);
  assert.doesNotMatch(html, /ouvert maintenant/i);
});

test('une annonce expire à minuit Paris sur une page laissée ouverte', () => {
  const page = runPage({ now: '2026-10-01T21:59:59Z', modify(data) { data.annonces = [closure()]; } });
  assert.equal(page.elements.announcements.hidden, false);
  assert.match(page.elements.announcements.innerHTML, /Fermeture du camion/);
  assert.match(page.elements.today.innerHTML, /fermeture exceptionnelle/);
  assert.match(page.elements.schedule.innerHTML, /Rendez-vous demain/);
  assert.equal(page.timers.length, 1);
  assert.ok(page.timers[0].delay <= 60000, 'le rafraîchissement doit arriver dans la minute');

  page.setTime('2026-10-01T22:00:00Z');
  page.tick();
  assert.equal(page.elements.announcements.hidden, true);
  assert.equal(page.elements.announcements.innerHTML, '');
  assert.match(page.elements.today.innerHTML, /Plérin/);
  assert.doesNotMatch(page.elements.today.innerHTML, /fermeture exceptionnelle/);
  assert.doesNotMatch(page.elements.schedule.innerHTML, /Rendez-vous demain/);
  assert.match(page.elements.schedule.innerHTML, /Vendredi.*2026-10-02.*Aujourd’hui/);
});

test('un changement de date est repris au retour dans un onglet visible', () => {
  const page = runPage({ now: '2026-10-01T21:59:59Z', modify(data) { data.annonces = [closure()]; } });
  page.setTime('2026-10-01T22:00:00Z');
  page.visibility(true);
  assert.equal(page.elements.announcements.hidden, false, 'une notification d’onglet caché ne force pas le rafraîchissement');
  page.visibility(false);
  assert.equal(page.elements.announcements.hidden, true);
  assert.match(page.elements.today.innerHTML, /Plérin/);
});

test('pageshow active puis retire une annonce lorsque le calendrier a changé', () => {
  const page = runPage({ now: '2026-10-01T21:59:59Z', modify(data) { data.annonces = [closure('2026-10-02', '2026-10-02')]; } });
  assert.equal(page.elements.announcements.hidden, true);
  assert.doesNotMatch(page.elements.schedule.innerHTML, /Fermeture exceptionnelle/);
  page.setTime('2026-10-01T22:00:00Z');
  page.pageshow();
  assert.equal(page.elements.announcements.hidden, false);
  assert.match(page.elements.today.innerHTML, /fermeture exceptionnelle/);
  page.setTime('2026-10-02T22:00:00Z');
  page.pageshow();
  assert.equal(page.elements.announcements.hidden, true);
  assert.match(page.elements.today.innerHTML, /Saint-Brieuc/);
});

test('les vérifications répétées dans la même journée ne réécrivent pas le contenu', () => {
  const page = runPage({ modify(data) { data.annonces = [closure()]; } });
  const initial = Object.fromEntries(['today', 'schedule', 'announcements', 'creme'].map((key) => [key, page.elements[key].htmlWrites]));
  page.tick();
  page.visibility(false);
  page.pageshow();
  for (const [key, count] of Object.entries(initial)) assert.equal(page.elements[key].htmlWrites, count, key);
  assert.deepEqual(page.document.events.filter((event) => event === 'gallois:content-updated'), ['gallois:content-updated']);
});

test('une configuration invalide conserve toute la version statique et signale le champ fautif', () => {
  const page = runPage({ modify(data) { data.pizzas[0].prix = -3; } });
  for (const element of Object.values(page.elements)) {
    assert.equal(element.htmlWrites, 0);
    assert.equal(element.attributes.size, 0);
  }
  assert.equal(page.elements.phoneNumber.textContent, 'Contenu statique conservé');
  assert.equal(page.elements.phone.textContent, 'Commander');
  assert.equal(page.errors.length, 1);
  assert.match(String(page.errors[0][1]), /pizzas\[0\].prix/);
  assert.equal(page.timers.length, 0);
  assert.deepEqual(page.document.events, []);
});

test('une dépendance absente laisse la page statique intacte sans erreur', () => {
  for (const omit of ['GalloisData', 'GalloisModel']) {
    const page = runPage({ omit });
    assert.equal(page.errors.length, 0);
    assert.equal(page.timers.length, 0);
    assert.equal(page.elements.creme.htmlWrites, 0);
    assert.equal(page.elements.phone.getAttribute('href'), null);
  }
});

test('le même runtime fonctionne aussi sur une page sans section de carte ou planning', () => {
  const page = runPage({ emptyPage: true });
  assert.equal(page.errors.length, 0);
  assert.equal(page.elements.creme.htmlWrites, 0);
  page.setTime('2026-10-02T12:00:00Z');
  assert.doesNotThrow(() => page.tick());
});
