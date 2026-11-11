# AMBS Visibility Hub

Frontend de pilotage SEO et GEO pour AMBS, construit avec React, TypeScript, TanStack Start et Tailwind CSS. Il reprend l’identité visuelle AMBS et les besoins du PDF « Mise à jour du site AMBS » fourni par l’utilisateur.

## Démarrer en local

Node.js 22.12 minimum (Node 24 conseillé) et npm sont nécessaires.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Ouvrir http://127.0.0.1:5173. Aucun secret n’est nécessaire. Utiliser `package-lock.json` avec npm.

## Deux espaces indépendants

L’espace **AMBS — suivi manuel**, disponible via la barre de travail ou les paramètres, conserve le référentiel du PDF. Il contient les expressions effectivement lisibles dans le PDF, les six Solutions, les cinq Cas clients, les articles associés, les guides et une déclinaison opérationnelle des actions SEO/GEO. Le domaine de référence est `ambs-agency.com`. Les URL proposées, rôles et échéances restent à valider. Une maquette n’est jamais initialisée comme une publication vérifiée. Les métriques inconnues et objectifs non établis restent vides.

Le PDF décrit aussi des fichiers externes contenant 240 expressions, 30 familles, les plans complets et 30 questions GEO. Ces fichiers ne sont pas incorporés au PDF. Le référentiel présent ici est donc une extraction des éléments visibles et une mise en forme pour le suivi, pas une reproduction de ces classeurs absents. Les contrôles d’audit sont une déclinaison opérationnelle des points décrits, pas une extraction des 24 lignes du classeur original.

L’espace **Démonstration enrichie** s’ouvre par défaut après cette mise à jour. Il couvre quatre sites : `ambs-agency.com`, `leads.ambs-agency.com`, `dialagent.fr` et `factory.dialagent.fr`. Le sélecteur de site filtre les listes, graphiques et exports. Il contient 240 mots-clés adaptés aux offres, 30 prompts, 150 réponses IA simulées, 60 actions reliées aux pages, 36 opportunités et 24 contrôles fictifs par page. Les statistiques restent fictives ; leur période de référence se termine le 10 novembre 2026. Les données du suivi manuel sont conservées indépendamment.

## Inventaire public et observations réelles

La rubrique **Sites & Liens** contient 133 URL repérées dans les sitemaps, les liens publics et la navigation JavaScript, avec un instantané daté du 11 novembre 2026. Le HTML de 126 URL accessibles a été relevé ; 7 autres URL ont renvoyé HTTP 404. Le catalogue contient les réponses HTTP, titres, H1, descriptions, canoniques, directives robots meta, nombres de H1/H2, liens internes, images sans attribut alt et blocs JSON-LD.

Ces constats sont distincts des statistiques simulées. Le HTML initial ne prouve ni le rendu final JavaScript, ni l’indexation, ni la validité des données structurées, ni les performances. Les routes DialAgent viennent de sa navigation JavaScript ; une réponse 200 peut être le même shell applicatif. Les pages privées et comptes ne sont pas explorés. L’inventaire n’est pas un crawl continu et ne garantit pas la découverte de pages non liées. Les fiches proposent des vérifications et permettent de créer une action liée au bon site.

Sources publiques : [AMBS](https://ambs-agency.com/), [Leads](https://leads.ambs-agency.com/), [DialAgent](https://dialagent.fr/), [Factory](https://factory.dialagent.fr/), sitemaps et liens de ces domaines. Les fichiers `src/lib/demo/public-pages.ts` et `public-audit.ts` portent l’instantané et ses contrôles.

## Fonctionnalités

- Quatorze rubriques : vue générale, sites et liens, SEO, GEO, mots-clés, prompts, actions, contenus, audit, backlinks, concurrents, leads, rapports et paramètres.
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

Le stockage est propre au navigateur : `ambs-hub-workspace-v1` pour AMBS et `ambs-hub-demo-v2` pour la nouvelle démo. Exporter régulièrement une sauvegarde complète depuis Paramètres. La restauration ne remplace que l’espace actif. L’ancien stockage `ambs-hub-demo-v1` est laissé intact ; la nouvelle démonstration ne l’écrase pas. Les sauvegardes JSON restent importables dans l’espace correspondant. Le choix du site est conservé séparément.

Il n’y a pas encore de backend partagé, de comptes utilisateurs ni de connecteurs Search Console, GA4, Bing ou CRM. L’application ne collecte pas automatiquement de nouvelles observations ; aucune publication du site AMBS ni requête à un moteur IA n’est exécutée. Les modules Backlinks et Concurrents acceptent des relevés manuels et permettent de créer les actions associées ; leurs mesures inconnues restent vides.

Les statistiques globales de trafic apparaissent uniquement dans la démo. Le SEO opérationnel affiche les relevés manuels par expression, afin de ne pas additionner des périmètres non comparables. Les délais des actions de référence sont des propositions à partir du 11 novembre 2026, modifiables par l’équipe.

Les images et l’icône AMBS sont incluses dans le projet et fonctionnent localement.

## Vérifications

```sh
npm run typecheck
npm test
npm run build
```

Le plugin TanStack Start régénère `src/routeTree.gen.ts` au démarrage et au build. Ne pas le modifier à la main ; lancer Vite après l’ajout d’une route avant le contrôle TypeScript.

Le build conserve la cible Cloudflare/Nitro et produit `.output/`. Il ne publie rien. Le navigateur automatisé était indisponible durant cette intervention : le rendu visuel ordinateur/mobile reste à valider séparément des tests TypeScript, composants, routes et HTTP.

## Contribution

Respecter les consignes de [AGENTS.md](./AGENTS.md). La configuration de compilation utilise directement les plugins Vite, React, Tailwind, TanStack Start et Nitro.
