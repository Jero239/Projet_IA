const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/contenu-modele.js');

function fixture() {
  return {
    fuseauHoraire: 'Europe/Paris', debutAppels: '16:00',
    contact: { telephone: '07 51 69 88 05', telephoneLien: '+33751698805', email: 'bonjour@example.fr' },
    pizzas: [{ id: 'reine', nom: 'La Reine', base: 'tomate', ingredients: ['Tomate', 'Jambon'], prix: 12.50, disponible: true, photo: null }],
    semaine: Array.from({ length: 7 }, (_, index) => ({ jour: index + 1, ouvert: index < 6, ville: index < 6 ? 'Bayeux' : '', adresse: index < 6 ? 'Place du marché' : '', debut: index < 6 ? '18:00' : '', fin: index < 6 ? '21:30' : '' })),
    annonces: []
  };
}

function announcement(overrides = {}) {
  return { id: 'conges', active: true, type: 'fermeture', titre: 'Fermeture', message: 'Le camion fait une pause.', debut: '2026-10-01', fin: '2026-10-03', remplacement: null, ...overrides };
}

test('les dates de début et fin sont incluses, la veille et le lendemain sont exclus', () => {
  const data = fixture();
  data.annonces.push(announcement());
  for (const day of ['2026-10-01', '2026-10-02', '2026-10-03']) assert.equal(model.activeAnnouncements(data, day).length, 1);
  for (const day of ['2026-09-30', '2026-10-04']) {
    assert.equal(model.activeAnnouncements(data, day).length, 0);
    assert.equal(model.renderAnnouncements(data, day), '');
  }
  data.annonces[0].active = false;
  assert.equal(model.activeAnnouncements(data, '2026-10-02').length, 0);
});

test('minuit et changements d’heure sont évalués au calendrier de Paris', () => {
  assert.equal(model.todayKey(new Date('2026-09-30T21:59:59Z')), '2026-09-30');
  assert.equal(model.todayKey(new Date('2026-09-30T22:00:00Z')), '2026-10-01');
  assert.equal(model.todayKey(new Date('2026-03-28T23:30:00Z')), '2026-03-29');
  assert.equal(model.todayKey(new Date('2026-03-29T22:30:00Z')), '2026-03-30');
  assert.equal(model.todayKey(new Date('2026-10-25T00:30:00Z')), '2026-10-25');
  assert.equal(model.todayKey(new Date('2026-10-25T01:30:00Z')), '2026-10-25');
  assert.equal(model.todayKey(new Date('2026-10-25T22:30:00Z')), '2026-10-25');
  assert.equal(model.todayKey(new Date('2026-10-25T23:00:00Z')), '2026-10-26');
});

test('le calcul de semaine reste correct aux changements de mois et année', () => {
  assert.equal(model.weekday('2026-10-04'), 7);
  assert.deepEqual(model.weekDates('2026-01-01'), ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
  assert.deepEqual(model.weekDates('2026-03-29'), ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29']);
});

test('un déplacement remplace le lieu et les heures, puis la tournée habituelle revient', () => {
  const data = fixture();
  data.annonces.push(announcement({ id: 'marche', type: 'emplacement', remplacement: { ville: 'Caen', adresse: 'Place du château', debut: '19:00', fin: '22:00' } }));
  const exception = model.effectiveDay(data, '2026-10-03');
  assert.equal(exception.ville, 'Caen');
  assert.equal(exception.debut, '19:00');
  assert.equal(exception.exception.id, 'marche');
  assert.equal(model.effectiveDay(data, '2026-10-05').ville, 'Bayeux');
  assert.equal(model.effectiveDay(data, '2026-10-05').exception, null);
  assert.match(model.renderToday(data, '2026-10-03'), /Emplacement exceptionnel.*Caen/);
});

test('une fermeture est prioritaire sur un déplacement même plus récent', () => {
  const data = fixture();
  data.annonces.push(announcement());
  data.annonces.push(announcement({ id: 'nouveau-lieu', type: 'emplacement', debut: '2026-10-02', remplacement: { ville: 'Caen', adresse: 'Centre', debut: '19:00', fin: '22:00' } }));
  assert.equal(model.effectiveDay(data, '2026-10-02').ouvert, false);
  assert.equal(model.effectiveDay(data, '2026-10-02').exception.id, 'conges');
  assert.match(model.renderToday(data, '2026-10-02'), /fermeture exceptionnelle/);
  assert.doesNotMatch(model.renderToday(data, '2026-10-02'), /18h|19h|service prévu à/);
});

test('à type identique la dernière date de début gagne, puis l’id alphabétique', () => {
  const data = fixture();
  data.annonces.push(announcement());
  data.annonces.push(announcement({ id: 'b', debut: '2026-10-02' }));
  data.annonces.push(announcement({ id: 'a', debut: '2026-10-02' }));
  assert.equal(model.effectiveDay(data, '2026-10-02').exception.id, 'a');
  data.annonces.reverse();
  assert.equal(model.effectiveDay(data, '2026-10-02').exception.id, 'a');
});

test('les annonces informatives ne changent pas le planning', () => {
  const data = fixture();
  data.annonces.push(announcement({ type: 'information' }));
  assert.equal(model.effectiveDay(data, '2026-10-02').exception, null);
  assert.equal(model.effectiveDay(data, '2026-10-02').ouvert, true);
});

test('le planning statique ne prétend pas connaître aujourd’hui et ignore les annonces', () => {
  const data = fixture();
  data.annonces.push(announcement());
  const html = model.renderSchedule(data);
  assert.doesNotMatch(html, /Aujourd’hui|Fermeture exceptionnelle|2026-10-01/);
  assert.equal((html.match(/class="schedule-card/g) || []).length, 7);
});

test('le planning daté retire les annonces périmées et ne révèle pas celles à venir', () => {
  const data = fixture();
  data.annonces.push(announcement({ id: 'terminee', titre: 'FINIE', message: 'FINIE', debut: '2026-09-28', fin: '2026-09-29' }));
  data.annonces.push(announcement({ id: 'future', titre: 'FUTURE', message: 'FUTURE', debut: '2026-10-03', fin: '2026-10-04' }));
  const html = model.renderSchedule(data, '2026-10-01');
  assert.doesNotMatch(html, /FINIE|FUTURE|Fermeture exceptionnelle/);
  assert.equal((html.match(/Aujourd’hui/g) || []).length, 1);
  assert.match(model.renderSchedule(data, '2026-10-03'), /FUTURE/);
});

test('un état indisponible reste une fiche avec nom, ingrédients et prix français', () => {
  const data = fixture();
  data.pizzas[0].disponible = false;
  const html = model.renderPizzaCards(data, 'tomate');
  assert.match(html, /is-unavailable/);
  assert.match(html, /Temporairement indisponible/);
  assert.match(html, /data-search="La Reine Tomate Jambon"/);
  assert.match(html, /12,50\s€/);
  assert.doesNotMatch(html, /<img/);
  assert.equal(model.renderPizzaCards(data, 'creme'), '');
});

test('les photos ne s’affichent que lorsqu’elles sont locales, décrites et confirmées', () => {
  const data = fixture();
  data.pizzas[0].photo = { src: 'assets/pizzas/reine.webp', alt: 'La Reine au jambon', confirmee: true };
  assert.equal(model.validateData(data), true);
  let html = model.renderPizzaCards(data, 'tomate');
  assert.match(html, /has-photo/);
  assert.match(html, /<img class="pizza-photo".*alt="La Reine au jambon".*loading="lazy"/);
  data.pizzas[0].photo.confirmee = false;
  assert.doesNotMatch(model.renderPizzaCards(data, 'tomate'), /<img/);
  data.pizzas[0].photo.confirmee = true;
  for (const src of ['https://example.fr/photo.jpg', '//example.fr/photo.jpg', 'assets/../prive.jpg', 'assets/%2e%2e/prive.jpg', 'assets\\photo.jpg', 'assets/photo.svg', 'assets//photo.jpg']) {
    data.pizzas[0].photo.src = src;
    assert.throws(() => model.validateData(data), /photo.src/);
    assert.doesNotMatch(model.renderPizzaCards(data, 'tomate'), /<img/);
  }
});

test('tous les textes et attributs variables du rendu sont échappés', () => {
  const data = fixture();
  data.pizzas[0].nom = '<script>alert("x")</script>';
  data.pizzas[0].id = '" onclick="alert(1)';
  data.pizzas[0].ingredients = ['<img src=x onerror=alert(1)>', "Chèvre & miel"];
  const cards = model.renderPizzaCards(data, 'tomate');
  assert.doesNotMatch(cards, /<script>|<img|data-pizza-id="" onclick=/);
  assert.match(cards, /&lt;script&gt;/);
  assert.match(cards, /Chèvre &amp; miel/);
  data.annonces.push(announcement({ titre: '<script>bad()</script>', message: '<iframe src="https://example.fr"></iframe>' }));
  for (const html of [model.renderAnnouncements(data, '2026-10-01'), model.renderSchedule(data, '2026-10-01'), model.renderToday(data, '2026-10-01')]) {
    assert.doesNotMatch(html, /<script>|<iframe/);
    assert.match(html, /&lt;iframe/);
  }
});

test('les résumés suivent les jours et horaires, y compris une semaine fermée', () => {
  const data = fixture();
  assert.equal(model.serviceDays(data), 'Du lundi au samedi');
  assert.equal(model.serviceSummary(data), 'Du lundi au samedi · à partir de 18h00');
  assert.equal(model.callSummary(data), 'Du lundi au samedi · appels dès 16h00');
  data.semaine[1].ouvert = false;
  assert.equal(model.serviceDays(data), 'Les lundi, mercredi, jeudi, vendredi et samedi');
  data.semaine[2].debut = '17:00';
  assert.match(model.serviceSummary(data), /17h00 selon le jour/);
  data.semaine.forEach((day) => { day.ouvert = false; });
  assert.equal(model.serviceDays(data), 'Aucun service programmé');
  assert.equal(model.serviceSummary(data), 'Aucun service programmé');
  assert.equal(model.callSummary(data), 'Aucun service programmé');
});

test('les données éditables sont validées avec un chemin utile dans chaque erreur', () => {
  assert.equal(model.validateData(fixture()), true);
  const invalid = [
    [(data) => { data.pizzas[0].prix = 12.501; }, /pizzas\[0\].prix/],
    [(data) => { data.pizzas[0].prix = Infinity; }, /pizzas\[0\].prix/],
    [(data) => { data.pizzas[0].prix = -1; }, /pizzas\[0\].prix/],
    [(data) => { data.pizzas.push({ ...data.pizzas[0] }); }, /identifiant déjà utilisé/],
    [(data) => { data.pizzas[0].disponible = 'false'; }, /disponible/],
    [(data) => { data.semaine[0].jour = 2; }, /semaine\[1\].jour/],
    [(data) => { data.semaine.pop(); }, /sept jours/],
    [(data) => { data.semaine[0].debut = '25:00'; }, /semaine\[0\].debut/],
    [(data) => { data.semaine[0].fin = '17:00'; }, /fin du service/],
    [(data) => { data.fuseauHoraire = 'Paris'; }, /fuseauHoraire/],
    [(data) => { data.contact.telephoneLien = 'javascript:alert(1)'; }, /telephoneLien/],
    [(data) => { data.contact.email = 'bad@example.fr?subject=bad'; }, /contact.email/],
    [(data) => { data.annonces.push(announcement({ debut: '2026-02-30' })); }, /annonces\[0\].debut/],
    [(data) => { data.annonces.push(announcement({ fin: '2026-09-30' })); }, /annonces\[0\].fin/],
    [(data) => { data.annonces.push(announcement({ type: 'emplacement' })); }, /remplacement/],
    [(data) => { data.annonces.push(announcement(), announcement()); }, /identifiant déjà utilisé/]
  ];
  invalid.forEach(([change, expected]) => {
    const data = fixture();
    change(data);
    assert.throws(() => model.validateData(data), expected);
  });
  assert.throws(() => model.weekday('2026-02-29'), /date réelle/);
  assert.equal(model.weekday('2024-02-29'), 4);
});
