/*
 * MODIFIER LE CONTENU DU SITE ICI.
 * Les recettes, prix, lieux et coordonnées ci-dessous reprennent les exemples
 * déjà présents sur la maquette : ils restent à confirmer avec Wayne et Patou.
 * Après modification : node scripts/actualiser-site.cjs
 * Cela met aussi à jour la version lisible sans JavaScript.
 */
(function (root) {
  'use strict';
  const data = {
    fuseauHoraire: 'Europe/Paris',
    debutAppels: '16:00',
    contact: {
      telephone: '06 12 34 56 78',
      telephoneLien: '+33612345678',
      email: 'bonjour@auxdelicesdugallois.fr'
    },

    // Prix en euros, point décimal : 12.5 sera affiché « 12,50 € ».
    // disponible: false conserve la fiche avec « Temporairement indisponible ».
    // photo: null tant qu’aucune photo de CETTE pizza n’est confirmée.
    // Pour une vraie photo : {src:'assets/pizzas/gallois.webp', alt:'La pizza La Gallois', confirmee:true}
    pizzas: [
      {
        id: 'gallois', nom: 'La Gallois', base: 'creme',
        ingredients: ['Crème', 'mozzarella', 'lardons fumés', 'oignons doux', 'pommes de terre'],
        prix: 12, disponible: true, photo: null
      },
      {
        id: 'forestiere', nom: 'La Forestière', base: 'creme',
        ingredients: ['Crème', 'champignons', 'jambon', 'mozzarella', 'persillade'],
        prix: 12, disponible: true, photo: null
      },
      {
        id: 'chevre-miel', nom: 'La Chèvre Miel', base: 'creme',
        ingredients: ['Crème', 'chèvre', 'mozzarella', 'noix', 'filet de miel'],
        prix: 12.5, disponible: true, photo: null
      },
      {
        id: 'vegetale', nom: 'La Végétale', base: 'creme',
        ingredients: ['Crème', 'courgettes', 'poivrons', 'champignons', 'mozzarella'],
        prix: 11.5, disponible: true, photo: null
      },
      {
        id: 'margherita', nom: 'La Margherita', base: 'tomate',
        ingredients: ['Tomate', 'mozzarella', 'basilic frais', 'huile d’olive'],
        prix: 10, disponible: true, photo: null
      },
      {
        id: 'calabraise', nom: 'La Calabraise', base: 'tomate',
        ingredients: ['Tomate', 'chorizo', 'poivrons', 'mozzarella', 'olives'],
        prix: 12.5, disponible: true, photo: null
      },
      {
        id: 'reine', nom: 'La Reine', base: 'tomate',
        ingredients: ['Tomate', 'jambon', 'champignons', 'mozzarella', 'olives'],
        prix: 12, disponible: true, photo: null
      },
      {
        id: 'bretonne', nom: 'La Bretonne', base: 'tomate',
        ingredients: ['Tomate', 'thon', 'oignons', 'mozzarella', 'câpres'],
        prix: 12, disponible: true, photo: null
      }
    ],

    // 1 = lundi … 7 = dimanche. Horaires HH:MM, ouverture et fermeture le même jour.
    semaine: [
      {jour: 1, ouvert: true, ville: 'Binic', adresse: 'Place du Marché', debut: '18:00', fin: '21:30'},
      {jour: 2, ouvert: true, ville: 'Saint-Quay', adresse: 'Parking du Port', debut: '18:00', fin: '21:30'},
      {jour: 3, ouvert: true, ville: 'Ploufragan', adresse: 'Place de l’Église', debut: '18:00', fin: '21:30'},
      {jour: 4, ouvert: true, ville: 'Langueux', adresse: 'Rue des Écoles', debut: '18:00', fin: '21:30'},
      {jour: 5, ouvert: true, ville: 'Plérin', adresse: 'Place de la Mairie', debut: '18:00', fin: '22:00'},
      {jour: 6, ouvert: true, ville: 'Saint-Brieuc', adresse: 'Place du Centre', debut: '18:00', fin: '22:00'},
      {jour: 7, ouvert: false, ville: '', adresse: '', debut: '', fin: ''}
    ],

    // Aucun exemple ci-dessous n’est publié : active reste à false.
    // Dates AAAA-MM-JJ : incluses, de 00h00 au dernier jour à 23h59, heure de Paris.
    // Une fermeture l’emporte sur un changement de lieu couvrant les mêmes dates.
    annonces: [
      {
        id: 'exemple-fermeture', active: false, type: 'fermeture',
        titre: 'Fermeture exceptionnelle',
        message: 'Le camion ne sera pas présent pendant cette période. Merci de votre compréhension.',
        debut: '2026-12-24', fin: '2026-12-26', remplacement: null
      },
      {
        id: 'exemple-emplacement', active: false, type: 'emplacement',
        titre: 'Changement d’emplacement',
        message: 'Retrouvez le camion à l’adresse indiquée ci-dessous.',
        debut: '2026-12-28', fin: '2026-12-28',
        remplacement: {ville: 'Ville à renseigner', adresse: 'Adresse à renseigner', debut: '18:00', fin: '21:30'}
      },
      {
        id: 'exemple-information', active: false, type: 'information',
        titre: 'Information du camion', message: 'Votre annonce à renseigner.',
        debut: '2026-12-01', fin: '2026-12-03', remplacement: null
      }
    ]
  };
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.GalloisData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
