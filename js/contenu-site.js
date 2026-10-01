/* Met les données partagées à jour sur chaque page, sans cookie ni requête tierce. */
(function () {
  'use strict';
  const data = window.GalloisData;
  const model = window.GalloisModel;
  if (!data || !model) return;
  try {
    model.validateData(data);
  } catch (error) {
    console.error('Les données du site doivent être corrigées.', error);
    return; // La carte et les horaires statiques restent consultables.
  }

  function setHTML(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      if (element.innerHTML !== value) element.innerHTML = value;
    });
  }
  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  }

  function updateSharedContent() {
    ['creme', 'tomate'].forEach((base) => {
      setHTML(`[data-pizza-list="${base}"]`, model.renderPizzaCards(data, base));
    });
    setText('[data-service-days]', model.serviceDays(data));
    setText('[data-service-summary]', model.serviceSummary(data));
    setText('[data-call-summary]', model.callSummary(data));
    setText('[data-call-start]', model.formatTime(data.debutAppels));
    document.querySelectorAll('[data-phone]').forEach((link) => {
      link.setAttribute('href', `tel:${data.contact.telephoneLien}`);
    });
    setText('[data-phone-text]', data.contact.telephone);
    document.querySelectorAll('[data-email]').forEach((link) => {
      link.setAttribute('href', `mailto:${encodeURIComponent(data.contact.email).replace(/%40/g, '@')}`);
      link.textContent = data.contact.email;
    });
    setText('[data-email-text]', data.contact.email);
    document.dispatchEvent(new CustomEvent('gallois:content-updated'));
  }

  let lastDate = '';
  function updateDatedContent() {
    const dateKey = model.todayKey(new Date(), data.fuseauHoraire);
    if (dateKey === lastDate) return;
    lastDate = dateKey;
    setHTML('[data-today]', model.renderToday(data, dateKey));
    setHTML('[data-schedule]', model.renderSchedule(data, dateKey));
    const announcements = model.renderAnnouncements(data, dateKey);
    document.querySelectorAll('[data-announcements]').forEach((region) => {
      region.innerHTML = announcements;
      region.hidden = announcements.length === 0;
    });
  }

  updateSharedContent();
  updateDatedContent();
  // Une page laissée ouverte suit le passage à minuit et le retour dans l’onglet.
  window.setInterval(updateDatedContent, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateDatedContent();
  });
  window.addEventListener('pageshow', updateDatedContent);
})();
