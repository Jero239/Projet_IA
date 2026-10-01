/* Fonctions partagées par le navigateur et la génération des pages HTML. */
(function (root, factory) {
  'use strict';
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.GalloisModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const FULL_DATE = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });

  function fail(field, message) {
    throw new Error(`Données du site — ${field} : ${message}`);
  }

  function nonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function requireString(value, field) {
    if (!nonEmpty(value)) fail(field, 'renseigner un texte non vide.');
  }

  function isDateKey(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function requireDateKey(value, field = 'date') {
    if (!isDateKey(value)) fail(field, 'utiliser une date réelle au format AAAA-MM-JJ.');
  }

  function isTime(value) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function requireTime(value, field) {
    if (!isTime(value)) fail(field, 'utiliser une heure entre 00:00 et 23:59 au format HH:MM.');
  }

  function requireService(place, field) {
    if (!place || typeof place !== 'object' || Array.isArray(place)) fail(field, 'renseigner le lieu et les horaires.');
    requireString(place.ville, `${field}.ville`);
    requireString(place.adresse, `${field}.adresse`);
    requireTime(place.debut, `${field}.debut`);
    requireTime(place.fin, `${field}.fin`);
    if (place.fin <= place.debut) fail(field, 'la fin du service doit être après le début, le même jour.');
  }

  function isLocalPhoto(path) {
    if (typeof path !== 'string' || !/^assets\/[A-Za-z0-9_ /.-]+\.(?:avif|webp|png|jpe?g)$/i.test(path)) return false;
    return path.split('/').every((part) => part && part !== '.' && part !== '..' && part.trim() === part);
  }

  function validateData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('configuration', 'un objet est attendu.');
    requireString(data.fuseauHoraire, 'fuseauHoraire');
    try {
      new Intl.DateTimeFormat('fr-FR', { timeZone: data.fuseauHoraire }).format(new Date(0));
    } catch (_) {
      fail('fuseauHoraire', 'utiliser un fuseau reconnu, par exemple Europe/Paris.');
    }
    requireTime(data.debutAppels, 'debutAppels');
    if (!data.contact || typeof data.contact !== 'object') fail('contact', 'renseigner téléphone et adresse e-mail.');
    if (!nonEmpty(data.contact.telephone) || !/^[+\d\s().-]+$/.test(data.contact.telephone) || data.contact.telephone.replace(/\D/g, '').length < 8) {
      fail('contact.telephone', 'renseigner un numéro de téléphone lisible.');
    }
    if (typeof data.contact.telephoneLien !== 'string' || !/^\+[1-9]\d{7,14}$/.test(data.contact.telephoneLien)) {
      fail('contact.telephoneLien', 'utiliser le format international sans espace, par exemple +33751698805.');
    }
    if (typeof data.contact.email !== 'string' || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(data.contact.email)) {
      fail('contact.email', 'renseigner une adresse e-mail valide.');
    }

    if (!Array.isArray(data.pizzas)) fail('pizzas', 'une liste est attendue.');
    const pizzaIds = new Set();
    data.pizzas.forEach((pizza, index) => {
      const field = `pizzas[${index}]`;
      if (!pizza || typeof pizza !== 'object') fail(field, 'une fiche pizza est attendue.');
      requireString(pizza.id, `${field}.id`);
      if (pizzaIds.has(pizza.id)) fail(`${field}.id`, `identifiant déjà utilisé : ${pizza.id}.`);
      pizzaIds.add(pizza.id);
      requireString(pizza.nom, `${field}.nom`);
      if (!['creme', 'tomate'].includes(pizza.base)) fail(`${field}.base`, 'choisir creme ou tomate.');
      if (!Array.isArray(pizza.ingredients) || !pizza.ingredients.length) fail(`${field}.ingredients`, 'renseigner au moins un ingrédient.');
      pizza.ingredients.forEach((ingredient, ingredientIndex) => requireString(ingredient, `${field}.ingredients[${ingredientIndex}]`));
      if (typeof pizza.prix !== 'number' || !Number.isFinite(pizza.prix) || pizza.prix < 0 || Math.abs(pizza.prix * 100 - Math.round(pizza.prix * 100)) > 0.000001) {
        fail(`${field}.prix`, 'utiliser un nombre positif ou nul avec au maximum deux décimales, par exemple 12.50.');
      }
      if (typeof pizza.disponible !== 'boolean') fail(`${field}.disponible`, 'utiliser true ou false.');
      if (pizza.photo !== null) {
        if (!pizza.photo || typeof pizza.photo !== 'object') fail(`${field}.photo`, 'utiliser null ou une photo avec src, alt et confirmee.');
        if (!isLocalPhoto(pizza.photo.src)) fail(`${field}.photo.src`, 'utiliser un fichier image local dans assets/ (jpg, png, webp ou avif), sans remontée de dossier.');
        requireString(pizza.photo.alt, `${field}.photo.alt`);
        if (pizza.photo.confirmee !== true) fail(`${field}.photo.confirmee`, 'une photo doit représenter la pizza réelle : confirmer avec true ou utiliser photo: null.');
      }
    });

    if (!Array.isArray(data.semaine) || data.semaine.length !== 7) fail('semaine', 'renseigner exactement les sept jours, de 1 (lundi) à 7 (dimanche).');
    const days = new Set();
    data.semaine.forEach((day, index) => {
      const field = `semaine[${index}]`;
      if (!day || !Number.isInteger(day.jour) || day.jour < 1 || day.jour > 7 || days.has(day.jour)) {
        fail(`${field}.jour`, 'chaque jour de 1 à 7 doit apparaître une seule fois.');
      }
      days.add(day.jour);
      if (typeof day.ouvert !== 'boolean') fail(`${field}.ouvert`, 'utiliser true ou false.');
      if (day.ouvert) requireService(day, field);
      else {
        ['ville', 'adresse', 'debut', 'fin'].forEach((key) => {
          if (typeof day[key] !== 'string') fail(`${field}.${key}`, 'renseigner un texte, ou une chaîne vide pour un jour fermé.');
        });
        if (day.debut !== '') requireTime(day.debut, `${field}.debut`);
        if (day.fin !== '') requireTime(day.fin, `${field}.fin`);
      }
    });

    if (!Array.isArray(data.annonces)) fail('annonces', 'une liste est attendue ; utiliser [] sans annonce.');
    const announcementIds = new Set();
    data.annonces.forEach((announcement, index) => {
      const field = `annonces[${index}]`;
      if (!announcement || typeof announcement !== 'object') fail(field, 'une annonce est attendue.');
      requireString(announcement.id, `${field}.id`);
      if (announcementIds.has(announcement.id)) fail(`${field}.id`, `identifiant déjà utilisé : ${announcement.id}.`);
      announcementIds.add(announcement.id);
      if (typeof announcement.active !== 'boolean') fail(`${field}.active`, 'utiliser true ou false.');
      if (!['information', 'fermeture', 'emplacement'].includes(announcement.type)) fail(`${field}.type`, 'choisir information, fermeture ou emplacement.');
      requireString(announcement.titre, `${field}.titre`);
      requireString(announcement.message, `${field}.message`);
      requireDateKey(announcement.debut, `${field}.debut`);
      requireDateKey(announcement.fin, `${field}.fin`);
      if (announcement.fin < announcement.debut) fail(`${field}.fin`, 'la date de fin doit être égale ou postérieure au début.');
      if (announcement.type === 'emplacement') requireService(announcement.remplacement, `${field}.remplacement`);
      else if (announcement.remplacement !== null) fail(`${field}.remplacement`, 'utiliser null pour une information ou une fermeture.');
    });
    return true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function todayKey(now = new Date(), timeZone = 'Europe/Paris') {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) fail('maintenant', 'une date valide est attendue.');
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function weekday(dateKey) {
    requireDateKey(dateKey);
    return new Date(`${dateKey}T12:00:00.000Z`).getUTCDay() || 7;
  }

  function weekDates(dateKey) {
    const day = weekday(dateKey);
    const monday = new Date(`${dateKey}T12:00:00.000Z`);
    monday.setUTCDate(monday.getUTCDate() - day + 1);
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(monday);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    });
  }

  function activeAnnouncements(data, dateKey) {
    requireDateKey(dateKey);
    return data.annonces.filter((announcement) => announcement.active === true && announcement.debut <= dateKey && announcement.fin >= dateKey);
  }

  function exceptionPriority(first, second) {
    const typeDifference = (first.type === 'fermeture' ? 0 : 1) - (second.type === 'fermeture' ? 0 : 1);
    if (typeDifference) return typeDifference;
    if (first.debut !== second.debut) return first.debut > second.debut ? -1 : 1;
    // Un identifiant alphabétiquement antérieur gagne en cas de dates identiques.
    if (first.id !== second.id) return first.id < second.id ? -1 : 1;
    return 0;
  }

  function effectiveDay(data, dateKey) {
    const day = data.semaine.find((entry) => entry.jour === weekday(dateKey));
    if (!day) fail('semaine', 'le jour demandé est absent.');
    const exception = activeAnnouncements(data, dateKey)
      .filter((announcement) => ['fermeture', 'emplacement'].includes(announcement.type))
      .sort(exceptionPriority)[0] || null;
    if (exception && exception.type === 'fermeture') return { ...day, ouvert: false, debut: '', fin: '', exception };
    if (exception && exception.type === 'emplacement') return { ...day, ...exception.remplacement, ouvert: true, exception };
    return { ...day, exception: null };
  }

  function formatTime(time) {
    requireTime(time, 'heure');
    return time.replace(':', 'h');
  }

  function serviceDays(data) {
    const open = data.semaine.filter((day) => day.ouvert).map((day) => day.jour).sort((a, b) => a - b);
    if (open.length === 0) return 'Aucun service programmé';
    if (open.length === 7) return 'Tous les jours';
    if (open.length === 1) return `Le ${DAYS[open[0] - 1]}`;
    if (open.every((day, index) => day === open[0] + index)) return `Du ${DAYS[open[0] - 1]} au ${DAYS[open[open.length - 1] - 1]}`;
    const names = open.map((day) => DAYS[day - 1]);
    return `Les ${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
  }

  function serviceSummary(data) {
    const openings = data.semaine.filter((day) => day.ouvert).map((day) => day.debut).sort();
    if (openings.length === 0) return serviceDays(data);
    const variation = new Set(openings).size > 1 ? ' selon le jour' : '';
    return `${serviceDays(data)} · à partir de ${formatTime(openings[0])}${variation}`;
  }

  function callSummary(data) {
    const days = serviceDays(data);
    return data.semaine.some((day) => day.ouvert) ? `${days} · appels dès ${formatTime(data.debutAppels)}` : days;
  }

  function renderPizzaCards(data, base) {
    return data.pizzas.filter((pizza) => pizza.base === base).map((pizza) => {
      const hasPhoto = !!(pizza.photo && pizza.photo.confirmee === true && nonEmpty(pizza.photo.alt) && isLocalPhoto(pizza.photo.src));
      const className = `pizza-card${base === 'tomate' ? ' tomato' : ''}${hasPhoto ? ' has-photo' : ''}${pizza.disponible === false ? ' is-unavailable' : ''}`;
      const visual = hasPhoto
        ? `<img class="pizza-photo" src="${escapeHtml(pizza.photo.src)}" alt="${escapeHtml(pizza.photo.alt)}" width="640" height="480" loading="lazy" decoding="async">`
        : `<span class="pizza-icon" aria-hidden="true">${base === 'tomate' ? 'T' : 'C'}</span>`;
      const status = pizza.disponible === false ? '<span class="pizza-status">Temporairement indisponible</span>' : '';
      return `<article class="${className}" data-pizza-card data-pizza-id="${escapeHtml(pizza.id)}" data-search="${escapeHtml([pizza.nom, ...pizza.ingredients].join(' '))}">${visual}<div class="pizza-details"><h3>${escapeHtml(pizza.nom)}</h3><p>${escapeHtml(pizza.ingredients.join(', '))}.</p>${status}</div><strong class="price">${escapeHtml(EURO.format(pizza.prix))}</strong></article>`;
    }).join('\n');
  }

  function renderSchedule(data, dateKey = null) {
    const dates = dateKey === null ? null : weekDates(dateKey);
    // Les anciennes et futures annonces ne sont pas affichées dans le planning.
    const currentData = dateKey === null ? data : { ...data, annonces: activeAnnouncements(data, dateKey) };
    return [...data.semaine].sort((first, second) => first.jour - second.jour).map((regular) => {
      const currentDate = dates ? dates[regular.jour - 1] : null;
      const day = currentDate ? effectiveDay(currentData, currentDate) : { ...regular, exception: null };
      const isToday = currentDate === dateKey && dateKey !== null;
      const className = `schedule-card${isToday ? ' today' : ''}${!day.ouvert ? ' closed' : ''}${day.exception ? ' has-exception' : ''}`;
      const name = DAYS[day.jour - 1];
      const dayName = name[0].toUpperCase() + name.slice(1);
      const date = currentDate ? ` <time datetime="${currentDate}">${currentDate.slice(8)}/${currentDate.slice(5, 7)}</time>` : '';
      const today = isToday ? ' <span class="today-label">Aujourd’hui</span>' : '';
      const title = day.ouvert ? escapeHtml(day.ville) : (day.exception ? 'Fermeture exceptionnelle' : 'Pas de service');
      const address = day.ouvert ? `<p>${escapeHtml(day.adresse)}</p>` : '';
      const explanation = day.exception ? `<p class="schedule-exception">${day.exception.type === 'emplacement' ? 'Emplacement exceptionnel. ' : ''}${escapeHtml(day.exception.message)}</p>` : '';
      const time = day.ouvert ? `${formatTime(day.debut)} – ${formatTime(day.fin)}` : 'Fermé';
      return `<article class="${className}"><span class="schedule-day">${dayName}${date}${today}</span><h3>${title}</h3>${address}${explanation}<span class="time">${time}</span></article>`;
    }).join('\n');
  }

  function renderAnnouncements(data, dateKey) {
    return activeAnnouncements(data, dateKey).map((announcement) => {
      const debut = `<time datetime="${announcement.debut}">${escapeHtml(FULL_DATE.format(new Date(`${announcement.debut}T12:00:00.000Z`)))}</time>`;
      const fin = `<time datetime="${announcement.fin}">${escapeHtml(FULL_DATE.format(new Date(`${announcement.fin}T12:00:00.000Z`)))}</time>`;
      const dates = announcement.debut === announcement.fin ? `Le ${debut}` : `Du ${debut} au ${fin} inclus`;
      const place = announcement.type === 'emplacement' ? announcement.remplacement : null;
      const location = place ? `<p><strong>${escapeHtml(place.ville)}</strong> · ${escapeHtml(place.adresse)} · ${formatTime(place.debut)}–${formatTime(place.fin)}</p>` : '';
      return `<article class="site-announcement ${escapeHtml(announcement.type)}" data-announcement-id="${escapeHtml(announcement.id)}"><h2>${escapeHtml(announcement.titre)}</h2><p>${escapeHtml(announcement.message)}</p>${location}<p class="announcement-dates">${dates}</p></article>`;
    }).join('\n');
  }

  function renderToday(data, dateKey) {
    const day = effectiveDay(data, dateKey);
    if (!day.ouvert) return day.exception ? `Aujourd’hui : fermeture exceptionnelle. ${escapeHtml(day.exception.message)}` : 'Aujourd’hui : aucun service prévu. Retrouvez nos prochains rendez-vous dans le planning.';
    const change = day.exception ? 'Emplacement exceptionnel : ' : '';
    return `Aujourd’hui : ${change}service prévu à <strong>${escapeHtml(day.ville)} · ${formatTime(day.debut)}–${formatTime(day.fin)}</strong> (${escapeHtml(day.adresse)}).`;
  }

  return Object.freeze({
    validateData, todayKey, activeAnnouncements, effectiveDay, weekday, weekDates,
    formatTime, serviceDays, serviceSummary, callSummary,
    renderPizzaCards, renderSchedule, renderAnnouncements, renderToday
  });
});
