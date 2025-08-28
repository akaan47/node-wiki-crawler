# Crawler Wikipedia Multilingue

Un crawler web continu pour Wikipedia qui découvre et extrait automatiquement le contenu des articles Wikipedia dans toutes les langues disponibles.

## Fonctionnalités

- **Crawling Multilingue**: Supporte plus de 20 langues Wikipedia (français, anglais, allemand, espagnol, etc.)
- **Fonctionnement Continu**: Fonctionne indéfiniment, découvrant constamment de nouveaux contenus
- **Base de Données Persistante**: Stocke toutes les données crawlées dans une base JSON qui grandit au fil du temps (à migrer dans une vraie db si c'est lancé en prod)
- **Prévention des Doublons**: Évite de crawler les mêmes pages plusieurs fois
- **Récupération d'Erreurs**: Gère les erreurs réseau et réessaie automatiquement les requêtes échouées
- **Crawling Respectueux**: Inclut des délais entre les requêtes pour ne pas surcharger les serveurs
- **Statistiques en Temps Réel**: Affiche la progression du crawling et les métriques de performance
- **Liens Interlangues**: Découvre automatiquement les versions d'articles dans d'autres langues

## Langues Supportées

Le crawler supporte actuellement ces langues Wikipedia :
- **Européennes**: Français (fr), Anglais (en), Allemand (de), Espagnol (es), Italien (it), Portugais (pt), Néerlandais (nl), Polonais (pl), Suédois (sv), Norvégien (no), Danois (da), Finnois (fi), Tchèque (cs)
- **Asiatiques**: Japonais (ja), Chinois (zh), Coréen (ko), Hébreu (he)
- **Autres**: Russe (ru), Arabe (ar), Turc (tr)

## Installation

1. Clonez ce dépôt :
```bash
git clone git clone https://github.com/akaan47/node-wiki-crawler.git
cd node-wiki-crawler
```

2. Installez les dépendances :
```bash
npm install
```

## Utilisation

Démarrez le crawler :
```bash
node index.js
```

Le crawler va :
- Charger les données existantes depuis `database.json`
- Commencer le crawling depuis des URL de démarrage prédéfinies
- Découvrir et crawler continuellement de nouveaux articles Wikipedia
- Sauvegarder automatiquement les progrès toutes les 10 pages
- Afficher des statistiques en temps réel
- Suivre les liens interlangues pour découvrir des articles dans d'autres langues

Pour arrêter le crawler, appuyez sur `Ctrl+C`.

## Configuration

Vous pouvez modifier ces paramètres dans le constructeur `WikipediaCrawler` :

- `requestDelay`: Temps entre les requêtes (défaut: 2000ms)
- `maxRetries`: Nombre de tentatives pour les requêtes échouées (défaut: 3)
- `wikipediaLanguages`: Liste des langues à crawler
- `startingUrls`: URLs initiales pour commencer le crawling

## Sortie

Le crawler génère un fichier `database.json` contenant :

- **Métadonnées**: Date de création, dernière mise à jour, informations de version
- **Statistiques**: Total des pages crawlées, liens trouvés, compteurs d'erreurs, statistiques par langue
- **Pages**: Données détaillées pour chaque page crawlée incluant :
  - Titre et contenu
  - Langue de l'article
  - Catégories
  - Coordonnées géographiques (si disponibles)
  - Données de l'infobox
  - Liens internes
  - Liens interlangues
  - Horodatage du crawling

## Limitations

- Exclut les pages spéciales, pages d'aide, et pages de discussion
- Limité à 25 liens internes par page pour gérer la taille de la queue
- Contenu limité aux 3 premiers paragraphes (max 2000 caractères)
- Délai de 2 secondes entre les requêtes pour respecter les serveurs

## Avertissement

Ce crawler est conçu pour un usage éducatif et de recherche. Veuillez respecter les conditions d'utilisation de Wikipedia et ne pas surcharger leurs serveurs. Le délai de 2 secondes entre les requêtes est implémenté pour être respectueux, mais vous pouvez l'ajuster selon vos besoins.
