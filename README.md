# AMBS Visibility Hub

Frontend de pilotage SEO et GEO pour AMBS, construit avec React, TypeScript, TanStack Start et Tailwind CSS. Il reprend l’identité visuelle du projet Lovable et les besoins du PDF « Mise à jour du site AMBS » fourni par l’utilisateur.

## Démarrer en local

Node.js 22.12 minimum (Node 24 conseillé) et npm sont nécessaires.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Ouvrir http://127.0.0.1:5173. Aucun secret n’est nécessaire. Utiliser `package-lock.json` avec npm ; le fichier Bun d’origine reste conservé pour Lovable.

## Deux espaces indépendants

L’espace **AMBS** s’ouvre par défaut. Il contient les expressions effectivement lisibles dans le PDF, les six Solutions, les cinq Cas clients, les articles associés, les guides et une déclinaison opérationnelle des actions SEO/GEO. Le domaine de référence est `ambs-agency.com`. Les URL proposées, rôles et échéances restent à valider. Une maquette n’est jamais initialisée comme une publication vérifiée. Les métriques inconnues et objectifs non établis restent vides.

Le PDF décrit aussi des fichiers externes contenant 240 expressions, 30 familles, les plans complets et 30 questions GEO. Ces fichiers ne sont pas incorporés au PDF. Le référentiel présent ici est donc une extraction des éléments visibles et une mise en forme pour le suivi, pas une reproduction de ces classeurs absents. Les contrôles d’audit sont une déclinaison opérationnelle des points décrits, pas une extraction des 24 lignes du classeur original.

L’espace **Démonstration**, accessible dans Paramètres, conserve les statistiques fictives d’origine, dont 240 mots-clés et les graphiques de trafic. Sa période de référence se termine le 10 novembre 2026. Ses données ne sont pas mélangées à celles de l’espace AMBS.

## Fonctionnalités

- Treize rubriques : vue générale, SEO, GEO, mots-clés, prompts, actions, contenus, audit, backlinks, concurrents, leads, rapports et paramètres.
- Plan de mots-clés : à qualifier, à cibler, à intégrer, intégré, à optimiser, à surveiller, archivé ; responsable, priorité, intention, page cible et emplacements travaillés.
- Ajout individuel ou par liste avec détection des doublons ; édition des expressions, volumes et difficultés quand ils sont connus.
- Relevés SEO datés et comparaison des deux dernières observations manuelles ; correction d’un relevé après confirmation.
- Actions reliées aux mots-clés, prompts et pages ; départ, objectif, résultat, preuve, priorité, statut et échéance. Une tâche récurrente terminée peut être reconduite explicitement sans doublon.
- Observations GEO manuelles avec moteur, réponse, sources, concurrents, exactitude et preuve. Les simulations sont identifiées et filtrées séparément.
- Fiches de pages, création de contenus à suivre, préparation des balises et états de publication/indexation déclarés manuellement.
- Audit page par page : 24 contrôles SEO/GEO, statut, observation, preuve et création d’une action corrective.
- Leads, sources, responsables, valeur et suivi commercial.
- CSV par rubrique, relevés et audits ; rapport PDF ; sauvegarde/restauration JSON complète avec validation et confirmation.
- Recherche, filtres, tri, pagination et adaptation des composants aux petits écrans.

## Données et limites

Le stockage est propre au navigateur : `ambs-hub-workspace-v1` pour AMBS et `ambs-hub-demo-v1` pour la démo. Exporter régulièrement une sauvegarde complète depuis Paramètres. La restauration ne remplace que l’espace actif. Les anciennes sauvegardes de démo restent compatibles.

Il n’y a pas encore de backend partagé, de comptes utilisateurs ni de connecteurs Search Console, GA4, Bing ou CRM. Les observations ne sont pas collectées automatiquement ; aucune publication du site AMBS ni requête à un moteur IA n’est exécutée. Les modules Backlinks et Concurrents acceptent des relevés manuels et permettent de créer les actions associées ; leurs mesures inconnues restent vides.

Les statistiques globales de trafic apparaissent uniquement dans la démo. Le SEO opérationnel affiche les relevés manuels par expression, afin de ne pas additionner des périmètres non comparables. Les délais des actions de référence sont des propositions à partir du 11 novembre 2026, modifiables par l’équipe.

Les deux images AMBS sont les fichiers d’origine récupérés depuis le projet Lovable pour fonctionner localement. Leurs métadonnées `*.asset.json` restent intactes.

## Vérifications

```sh
npm run typecheck
npm test
npm run build
```

Le plugin Lovable régénère `src/routeTree.gen.ts` au démarrage et au build. Ne pas le modifier à la main ; lancer Vite après l’ajout d’une route avant le contrôle TypeScript.

Le build conserve la cible Cloudflare/Nitro et produit `.output/`. Il ne publie rien. Le navigateur automatisé était indisponible durant cette intervention : le rendu visuel ordinateur/mobile reste à valider séparément des tests TypeScript, composants, routes et HTTP.

## Lovable

Projet connecté à [Lovable](https://lovable.dev/projects/65afc97d-3a2e-49b3-8d54-e932d8c103ef). Ne pas réécrire l’historique publié. Les migrations, secrets, connecteurs et fichiers générés restent gérés selon [AGENTS.md](./AGENTS.md).
