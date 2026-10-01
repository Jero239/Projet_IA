(function () {
  'use strict';

  const form = document.querySelector('[data-menu-search]');
  const input = document.querySelector('#pizza-search');
  const count = document.querySelector('#pizza-search-count');
  const empty = document.querySelector('[data-menu-empty]');
  if (!form || !input || !count || !empty) return;

  // Normalisation commune du texte saisi et des noms/ingrédients de la carte.
  function normalize(text) {
    return text.toLocaleLowerCase('fr')
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function filterPizzas() {
    const query = normalize(input.value);
    const words = query ? query.split(/\s+/) : [];
    const cards = Array.from(document.querySelectorAll('[data-pizza-card]'));
    let matches = 0;

    cards.forEach((card) => {
      const searchable = normalize(card.dataset.search || '');
      const visible = words.every((word) => searchable.includes(word));
      card.hidden = !visible;
      if (visible) matches += 1;
    });

    document.querySelectorAll('[data-menu-group]').forEach((group) => {
      group.hidden = !Array.from(group.querySelectorAll('[data-pizza-card]'))
        .some((card) => !card.hidden);
    });

    empty.hidden = matches !== 0;
    const message = `${matches} pizza${matches > 1 ? 's' : ''} ${matches > 1 ? 'affichées' : 'affichée'} sur ${cards.length}.`;
    // Évite une annonce identique répétée à chaque rafraîchissement des données.
    if (count.textContent !== message) count.textContent = message;
  }

  function resetSearch() {
    input.value = '';
    filterPizzas();
    input.focus();
  }

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('reset', (event) => {
    event.preventDefault();
    resetSearch();
  });
  input.addEventListener('input', filterPizzas);
  input.addEventListener('search', filterPizzas);
  empty.querySelector('[data-menu-reset]').addEventListener('click', resetSearch);
  document.addEventListener('gallois:content-updated', filterPizzas);

  form.hidden = false;
  filterPizzas();
})();
