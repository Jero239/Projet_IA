/* Synchronise les versions HTML consultables sans JavaScript. Aucune dépendance. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/contenu-modele.js');
const root = path.resolve(__dirname, '..');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function block(html, key, content) {
  const start = `<!-- content:${key} -->`;
  const end = `<!-- /content:${key} -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2 || html.indexOf(end) < html.indexOf(start)) {
    throw new Error(`Repères HTML manquants ou dupliqués : ${key}. Aucun fichier n’a été modifié.`);
  }
  return html.slice(0, html.indexOf(start) + start.length) + '\n' + content + '\n        ' + html.slice(html.indexOf(end));
}

function textAttribute(html, attribute, value) {
  const pattern = new RegExp(`(<([a-z][a-z0-9]*)\\b[^>]*\\s${attribute}(?=[\\s>])[^>]*>)[\\s\\S]*?(<\\/\\2>)`, 'gi');
  return html.replace(pattern, (_, opening, tag, closing) => opening + escapeHtml(value) + closing);
}

function linkAttribute(html, attribute, href) {
  return html.replace(/<a\b[^>]*>/gi, (opening) => {
    if (!new RegExp(`\\s${attribute}(?=[\\s>])`).test(opening)) return opening;
    return opening.replace(/href="[^"]*"/, () => `href="${escapeHtml(href)}"`);
  });
}

function renderPage(name, html, data) {
  model.validateData(data);
  if (name === 'menu.html') {
    html = block(html, 'menu-creme', model.renderPizzaCards(data, 'creme'));
    html = block(html, 'menu-tomate', model.renderPizzaCards(data, 'tomate'));
  }
  if (name === 'emplacements.html') html = block(html, 'schedule', model.renderSchedule(data));
  const values = {
    'data-service-days': model.serviceDays(data),
    'data-service-summary': model.serviceSummary(data),
    'data-call-summary': model.callSummary(data),
    'data-call-start': model.formatTime(data.debutAppels),
    'data-phone-text': data.contact.telephone,
    'data-email-text': data.contact.email,
    'data-email': data.contact.email
  };
  for (const [attribute, value] of Object.entries(values)) html = textAttribute(html, attribute, value);
  html = linkAttribute(html, 'data-phone', `tel:${data.contact.telephoneLien}`);
  return linkAttribute(html, 'data-email', `mailto:${encodeURIComponent(data.contact.email).replace(/%40/g, '@')}`);
}

function synchronize(checkOnly = false) {
  const data = require('../js/donnees-site.js');
  model.validateData(data);
  for (const pizza of data.pizzas) {
    if (pizza.photo && (!fs.existsSync(path.join(root, pizza.photo.src)) || !fs.statSync(path.join(root, pizza.photo.src)).isFile())) {
      throw new Error(`Photo introuvable pour ${pizza.nom} : ${pizza.photo.src}. Ajoutez la vraie photo ou utilisez photo: null.`);
    }
  }
  const names = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
  for (const required of ['menu.html', 'emplacements.html', 'index.html', 'contact.html']) {
    if (!names.includes(required)) throw new Error(`Page manquante : ${required}.`);
  }
  // Prépare et valide toutes les pages avant la première écriture.
  const changes = names.map((name) => {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    return { name, source, output: renderPage(name, source, data) };
  }).filter((page) => page.source !== page.output);
  if (checkOnly && changes.length) {
    throw new Error(`Pages à actualiser : ${changes.map((page) => page.name).join(', ')}. Lancez node scripts/actualiser-site.cjs.`);
  }
  if (!checkOnly) for (const page of changes) fs.writeFileSync(path.join(root, page.name), page.output, 'utf8');
  return changes.length;
}

if (require.main === module) {
  try {
    const count = synchronize(process.argv.includes('--check'));
    console.log(count ? `${count} page(s) actualisée(s).` : 'Données valides : toutes les pages sont à jour.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { renderPage, synchronize };
