'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../js/donnees-site.js');
const source = fs.readFileSync(path.join(__dirname, '../js/menu.js'), 'utf8');

function element(extra = {}) {
  return { hidden: false, textContent: '', events: {},
    addEventListener(type, fn) { this.events[type] = fn; },
    fire(type) { const event = { prevented: false, preventDefault() { this.prevented = true; } }; this.events[type](event); return event; },
    ...extra
  };
}

function setup(pizzas = data.pizzas) {
  const cards = pizzas.map((pizza) => element({ id: pizza.id, base: pizza.base, dataset: { search: [pizza.nom, ...pizza.ingredients].join(' ') } }));
  const groups = ['creme', 'tomate'].map((base) => element({ base, querySelectorAll: () => cards.filter((card) => card.base === base) }));
  const form = element({ hidden: true });
  const input = element({ value: '', focused: false, focus() { this.focused = true; } });
  const count = element();
  const reset = element();
  const empty = element({ hidden: true, querySelector: () => reset });
  const selectors = { '[data-menu-search]': form, '#pizza-search': input, '#pizza-search-count': count, '[data-menu-empty]': empty };
  const document = element({
    querySelector: (selector) => selectors[selector] || null,
    querySelectorAll: (selector) => selector === '[data-pizza-card]' ? cards : groups
  });
  vm.runInNewContext(source, { document });
  return { cards, groups, input, count, empty, form, reset, document,
    search(value) { input.value = value; input.fire('input'); return cards.filter((card) => !card.hidden).map((card) => card.id); }
  };
}

test('la recherche devient disponible et affiche initialement les huit fiches', () => {
  const site = setup();
  assert.equal(site.form.hidden, false);
  assert.equal(site.empty.hidden, true);
  assert.equal(site.count.textContent, '8 pizzas affichées sur 8.');
  assert.ok(site.groups.every((group) => !group.hidden));
  assert.equal(site.form.fire('submit').prevented, true);
});

test('recherche par nom ou ingrédient, sans casse ni accents et avec plusieurs mots', () => {
  const site = setup();
  assert.deepEqual(site.search('CHÈVRE'), ['chevre-miel']);
  assert.deepEqual(site.search('chevre'), ['chevre-miel']);
  assert.deepEqual(site.search('  jambon   CHAMPIGNONS '), ['forestiere', 'reine']);
  assert.deepEqual(site.search('capres'), ['bretonne']);
  assert.deepEqual(site.search('La reine'), ['reine']);
  assert.equal(site.count.textContent, '1 pizza affichée sur 8.');
  assert.equal(site.groups.find((g) => g.base === 'creme').hidden, true);
});

test('les ligatures et la ponctuation sont normalisées', () => {
  const site = setup([{ id: 'test', nom: 'La Cœur', base: 'creme', ingredients: ['Œuf', 'crème-fraîche'] }]);
  assert.deepEqual(site.search('coeur oeuf creme fraiche'), ['test']);
  assert.deepEqual(site.search('  ---  '), ['test']);
});

test('aucun résultat révèle le bouton de réinitialisation et celui-ci rend le focus', () => {
  const site = setup();
  assert.deepEqual(site.search('ananas'), []);
  assert.equal(site.empty.hidden, false);
  assert.ok(site.groups.every((group) => group.hidden));
  site.reset.fire('click');
  assert.equal(site.input.value, '');
  assert.equal(site.input.focused, true);
  assert.equal(site.empty.hidden, true);
  assert.ok(site.cards.every((card) => !card.hidden));
});

test('le bouton effacer et l’effacement natif du champ restaurent la carte', () => {
  const site = setup();
  site.search('miel');
  assert.equal(site.form.fire('reset').prevented, true);
  assert.equal(site.count.textContent, '8 pizzas affichées sur 8.');
  site.search('tomate');
  site.input.value = '';
  site.input.fire('search');
  assert.ok(site.cards.every((card) => !card.hidden));
});

test('les indisponibles restent recherchables et le filtre survit au rafraîchissement', () => {
  const pizzas = structuredClone(data.pizzas);
  pizzas[0].disponible = false;
  const site = setup(pizzas);
  assert.deepEqual(site.search('gallois'), ['gallois']);
  site.cards[0].dataset.search = 'Recette renommée';
  site.document.fire('gallois:content-updated');
  assert.equal(site.input.value, 'gallois');
  assert.equal(site.empty.hidden, false);
});

test('le script reste inoffensif sur les autres pages', () => {
  assert.doesNotThrow(() => vm.runInNewContext(source, { document: { querySelector: () => null } }));
});
