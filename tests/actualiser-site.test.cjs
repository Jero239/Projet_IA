'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderPage, synchronize } = require('../scripts/actualiser-site.cjs');
const model = require('../js/contenu-modele.js');
const data = require('../js/donnees-site.js');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const names = fs.readdirSync(root).filter((name) => name.endsWith('.html'));

test('les pages générées sont synchronisées et la génération est idempotente', () => {
  assert.equal(synchronize(true), 0);
  for (const name of names) {
    const once = renderPage(name, read(name), data);
    assert.equal(renderPage(name, once, data), once);
  }
});

test('un seul changement central répercute tarifs, fiches et planning statiques', () => {
  const changed = structuredClone(data);
  changed.pizzas[0].prix = 15.25;
  changed.pizzas[0].disponible = false;
  changed.pizzas[0].ingredients.push('Artichaut');
  changed.semaine[0].ville = 'Lieu de test';
  changed.semaine[0].debut = '17:30';
  const menu = renderPage('menu.html', read('menu.html'), changed);
  assert.match(menu, /15,25\s€/);
  assert.match(menu, /Temporairement indisponible/);
  assert.match(menu, /Artichaut/);
  const schedule = renderPage('emplacements.html', read('emplacements.html'), changed);
  assert.match(schedule, /Lieu de test/);
  assert.match(schedule, /17h30/);
  assert.doesNotMatch(schedule, /class="schedule-card today"/);
});

test('coordonnées et heure des appels se répercutent dans toutes leurs occurrences', () => {
  const changed = structuredClone(data);
  changed.contact = { telephone: '07 11 22 33 44', telephoneLien: '+33711223344', email: 'essai@example.fr' };
  changed.debutAppels = '15:30';
  for (const name of names) {
    const html = renderPage(name, read(name), changed);
    assert.doesNotMatch(html, /0612345678|\+33612345678|06 12 34 56 78|bonjour@auxdelicesdugallois.fr/);
    assert.match(html, /tel:\+33711223344/);
    if (read(name).includes('data-call-start') || read(name).includes('data-call-summary')) assert.match(html, /15h30/);
    if (read(name).includes('data-email')) assert.match(html, /essai@example.fr/);
  }
});

test('les repères absents ou données erronées bloquent la génération', () => {
  assert.throws(() => renderPage('menu.html', '<html></html>', data), /Repères HTML/);
  const changed = structuredClone(data);
  changed.pizzas[0].prix = 'douze';
  assert.throws(() => renderPage('menu.html', read('menu.html'), changed), /prix/);
});

test('une adresse e-mail avec caractères réservés garde un lien mailto sûr', () => {
  const changed = structuredClone(data);
  changed.contact.email = 'wayne?pizza#test%25@example.fr';
  const html = renderPage('contact.html', read('contact.html'), changed);
  assert.match(html, /mailto:wayne%3Fpizza%23test%2525@example.fr/);
  assert.match(html, />wayne\?pizza#test%25@example.fr<\/a>/);
});

test('les annonces ne sont pas figées dans le HTML statique et une relocalisation donne son adresse', () => {
  const changed = structuredClone(data);
  const relocation = changed.annonces.find((a) => a.type === 'emplacement');
  relocation.active = true;
  relocation.remplacement = { ville: 'Ville test', adresse: 'Place <Test>', debut: '19:00', fin: '22:00' };
  const banner = model.renderAnnouncements(changed, relocation.debut);
  assert.match(banner, /Ville test/);
  assert.match(banner, /Place &lt;Test&gt;/);
  assert.match(banner, /19h00–22h00/);
  for (const name of names) assert.doesNotMatch(renderPage(name, read(name), changed), /data-announcement-id=/);
});

test('chaque page charge les dépendances dans le bon ordre et une région d’annonces vide', () => {
  for (const name of names) {
    const html = read(name);
    const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map((m) => m[1]);
    assert.deepEqual(scripts.slice(0, 4), ['js/donnees-site.js', 'js/contenu-modele.js', 'js/contenu-site.js', 'js/main.js']);
    assert.match(html, /data-announcements[^>]* hidden><\/div>/);
    assert.match(html, /css\/contenu-site.css/);
    if (name === 'menu.html') assert.equal(scripts[4], 'js/menu.js');
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    for (const match of html.matchAll(/<(?:script|img|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
      if (/^(?:https?:|\/\/)/.test(match[1])) assert.fail(`Ressource externe inattendue dans ${name}`);
      assert.ok(fs.existsSync(path.join(root, match[1])), `${name} : ${match[1]} absent`);
    }
    for (const image of html.matchAll(/<img\b[^>]*>/g)) assert.match(image[0], /\balt="[^"]*"/);
  }
});
