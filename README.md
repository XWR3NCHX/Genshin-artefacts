# Genshin-artefacts

Site statique HTML/CSS/JavaScript pour parcourir les sets d’artéfacts de Genshin Impact, consulter leurs bonus, créer une liste de souhaits et planifier leur farm sur la semaine.

## Important : séparation avec le site de personnages

Ce projet est totalement séparé du dépôt `Genshin-fiche`. Il ne remplace ni ne modifie ses fichiers `index.html`, `style.css`, `script.js` ou `data.json`. Tu peux donc laisser le site de personnages tel quel.

La liste de souhaits est enregistrée dans `localStorage` sous la clé `genshin-artefacts-wishlist-v1`. Comme les deux dépôts GitHub Pages ont des origines différentes, cette liste est indépendante de celle de tout autre site.

## Installation sur GitHub

1. Crée un dépôt séparé, par exemple `Genshin-artefacts`.
2. Téléverse tous les fichiers et dossiers de ce projet en conservant leur structure.
3. Dans le dépôt, ouvre **Settings → Pages**.
4. Dans **Build and deployment**, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis enregistre.
5. Attends la publication. L’adresse sera du type `https://TON-PSEUDO.github.io/Genshin-artefacts/`.

## Données

Le catalogue utilise une API communautaire tierce pour obtenir les informations et les images. Le site nécessite une connexion Internet pour charger les données. La disponibilité, les champs renvoyés et les URL d’images dépendent du service tiers; les erreurs de chargement sont signalées à l’écran.

Le code tente de gérer plusieurs noms de champs courants, mais une modification de l’API peut nécessiter une adaptation dans `js/app.js`.

## Fonctions incluses

- Recherche par nom
- Filtre de rareté
- Fiche détaillée avec bonus 2 pièces / 4 pièces et pièces si disponibles
- Liste de souhaits persistante sur ce navigateur
- Retrait individuel et suppression complète
- Planification du lundi au dimanche; les domaines d’artéfacts ne suivent pas la rotation hebdomadaire des matériaux de talents et d’armes

## À savoir

- Pour des données fiables et complètes, vérifie les informations en jeu si l’API ne fournit pas un champ.
- Les noms, descriptions et images de Genshin Impact appartiennent à leurs ayants droit. Projet fan-made non officiel, sans affiliation à HoYoverse.
- Les données communautaires sont attribuées à [Genshin-DB](https://github.com/theBowja/genshin-db) et à l’API utilisée. Vérifie les conditions de licence des ressources avant une redistribution publique.
