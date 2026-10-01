# Mettre à jour Aux délices du Gallois

## Le seul fichier de contenu à modifier

Ouvrez **`js/donnees-site.js`**. Il regroupe les pizzas, leurs prix et disponibilités, les horaires habituels, les coordonnées et les annonces temporaires.

Les recettes, prix, emplacements et coordonnées actuellement présents proviennent de la maquette : faites-les confirmer par Wayne et Patou avant publication. Les exemples d’annonces sont désactivés ; aucune fermeture réelle n’a été inventée.

Après chaque modification, depuis le dossier du site, lancez :

```sh
node scripts/actualiser-site.cjs
```

Il faut Node.js pour cette étape de préparation, mais pas chez l’hébergeur ni chez les visiteurs. Le script vérifie les données et actualise les pages HTML pour les visiteurs sans JavaScript et les outils automatisés. Ne modifiez pas manuellement les recettes et horaires dans les pages générées.

Publiez ensuite ensemble les fichiers HTML et les dossiers `assets`, `css` et `js`. Le fichier de données n’est pas un espace privé : n’y mettez aucun secret ni donnée de client. Ne publiez pas `sources/`, les tests ou les documents de travail. Configurez l’hébergement pour revalider les fichiers HTML et JavaScript à chaque visite (par exemple `Cache-Control: no-cache`) afin de ne pas conserver un ancien tarif en cache.

## Prix, composition et disponibilité

Dans `pizzas`, chaque fiche a un `id` unique et stable. Les deux bases possibles sont `creme` et `tomate`.

- `nom` : nom affiché ; `ingredients` : liste des ingrédients, recherchables avec le nom.
- `prix: 12.50` : nombre en euros, avec un point dans ce fichier et deux décimales maximum. Le site affiche automatiquement `12,50 €`.
- `disponible: false` : garde la pizza dans la carte et les résultats, avec « Temporairement indisponible ». Remettez `true` lorsqu’elle revient.
- `photo: null` : aucune photo, seulement un repère décoratif C ou T.

Pour une photo, ajoutez le fichier dans `assets/pizzas/`, puis remplacez `null` par exemple par :

```js
{ src: 'assets/pizzas/gallois.webp', alt: 'La Gallois, garnie de lardons, oignons et pommes de terre', confirmee: true }
```

N’utilisez `confirmee: true` qu’après avoir vérifié que la photo représente réellement cette pizza et que vous avez le droit de l’utiliser. Formats acceptés : JPG, PNG, WebP et AVIF. Aucun service d’images externe n’est chargé.

## Horaires et coordonnées

`semaine` comporte toujours sept entrées : `jour: 1` pour lundi jusqu’à `jour: 7` pour dimanche. Modifiez `ville`, `adresse`, `debut` et `fin` dans la journée concernée. Les heures utilisent `HH:MM`, par exemple `18:00` ; le service doit se terminer le même jour après son début. Un jour sans service utilise `ouvert: false`.

`debutAppels` règle l’heure des appels affichée sur le site. Dans `contact`, `telephone` est le numéro lisible et `telephoneLien` sa version internationale sans espaces ; changez les deux ensemble. `email` actualise les liens de contact et le destinataire du formulaire.

## Annonces temporaires

Dupliquez un exemple de `annonces` avec un nouvel `id`, complétez-le, puis passez `active` à `true`. Chaque annonce a un `titre`, un `message`, une date `debut` et une date `fin` au format `AAAA-MM-JJ`.

Les dates de début et de fin sont incluses, de minuit à la fin de journée dans le fuseau `Europe/Paris`. Ce sont à la fois les dates d’affichage et d’application de l’exception. Une annonce future reste cachée jusqu’à son début ; une annonce passée disparaît. Pour prévenir en avance, utilisez une annonce de type `information` distincte, dont le message précise la date de l’événement.

- `information` : affiche simplement un message ; laissez `remplacement: null`.
- `fermeture` : signale la fermeture et modifie aussi le lieu du jour et le planning ; laissez `remplacement: null`.
- `emplacement` : renseignez `remplacement` avec `ville`, `adresse`, `debut`, `fin`. L’adresse temporaire remplace le lieu habituel pendant la période, y compris si le jour était normalement fermé.

Évitez les annonces contradictoires qui se chevauchent. Dans le planning, une fermeture est prioritaire sur un déplacement ; entre deux exceptions du même type, la date de début la plus récente gagne, puis l’identifiant dans l’ordre alphabétique. Toutes les annonces actives restent visibles. Le planning affiche la semaine courante en tenant compte des annonces actuellement actives, sans conserver les exceptions expirées.

L’expiration est recalculée dans le navigateur, même si la page reste ouverte, et au retour dans l’onglet. Elle dépend de l’horloge de l’appareil. Sans JavaScript, le site affiche seulement le planning habituel et invite à confirmer les exceptions par téléphone ; il n’affiche pas d’annonce datée qui pourrait rester périmée.

## Vérifier avant de publier

```sh
node scripts/actualiser-site.cjs --check
node --test tests/*.test.cjs
```

Vérifiez aussi visuellement `menu.html` sur mobile et ordinateur : recherchez « chevre », « jambon champignons » et un mot absent, puis réinitialisez. Testez une indisponibilité et une annonce datée dans une copie locale avant de publier. La recherche reste locale au navigateur : ni transmission, ni cookie, ni conservation de la saisie.

Ces ajouts fonctionnels ne constituent pas un audit juridique. Les champs à compléter des mentions légales et les informations commerciales de la maquette restent à valider avant toute mise en ligne réelle.
