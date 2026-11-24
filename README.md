# AMBS Visibility Hub

Application de pilotage SEO/GEO pour l’écosystème public AMBS : `ambs-agency.com`, ses sous-domaines de production, `dialagent.fr`, `trefle.offres-privileges.com` et `pautric.ambs-ia.com`. Frontend **Next.js 16 / React 19**, API **Express 5**, base **PostgreSQL 17**. Le suivi est partagé entre utilisateurs authentifiés ; les chiffres de démonstration ne sont plus chargés.

## Démarrage local

Prérequis : Node.js 22.12 minimum, npm, PostgreSQL 17 (`initdb`, `pg_ctl`, `psql`, `createdb` dans le PATH ; MacPorts `/opt/local/bin` est aussi détecté).

```sh
npm ci
npm run db:local
npm run dev
```

Ouvrir **http://localhost:3000** et créer le premier compte administrateur. Aucun compte ni mot de passe prédéfini. L’API écoute sur `127.0.0.1:4000`, accessible par le proxy `/api` de Next.js. Le premier démarrage applique les migrations et initialise le référentiel une seule fois.

`db:local` crée un cluster propre au projet dans `.data/postgres`, accessible uniquement par son socket `.data/socket`, port 55439. Il ne modifie pas les autres bases de la machine. Il crée `.env` avec une clé de chiffrement aléatoire si le fichier n’existe pas. Ne pas partager `.env` ni `.data`. L’authentification locale du socket repose sur les permissions du dossier : ce mode est réservé au développement sur cette machine.

Avec un PostgreSQL existant, copier `.env.example` en `.env`, renseigner `DATABASE_URL` et une clé `TOKEN_ENCRYPTION_KEY` de 32 octets hexadécimaux, puis utiliser `npm run dev` sans `db:local`.

Arrêt du cluster propre au projet :

```sh
pg_ctl -D "$PWD/.data/postgres" stop
```

Les modifications du navigateur sont enregistrées dans PostgreSQL. Un conflit avec une autre session provoque une erreur et un rechargement des données, sans écraser silencieusement ses changements. Le choix du site reste une préférence locale. Les anciens espaces de démonstration du navigateur ne sont pas importés.

## Ce qui est réel, proposé ou absent

- **Inventaire public** : 133 URL, observations HTTP/HTML datées et sources visibles dans « Sites & Liens ». Le snapshot initial du 11 novembre 2026 comptait 126 réponses 200 et 7 réponses 404. Les pages d’accueil ont ensuite été relevées à nouveau. Chaque fiche permet un nouveau relevé public, stocké en base.
- **Référentiel** : les expressions et besoins visibles dans le PDF « Mise à jour du site AMBS » fourni par l’utilisateur alimentent un plan à travailler. Une cible n’est pas une position mesurée ; une action proposée n’est pas une action réalisée. Responsables initialement « À attribuer », dates et métriques inconnues vides.
- **GEO** : les questions de travail sont activées uniquement pour les sites dont le périmètre éditorial est documenté ; aucune réponse n’est inventée. Exécuter une question dans le moteur choisi, puis saisir la réponse observée, la date, les citations et une URL de preuve. Les copies de la question et simulations sont refusées. Les résultats reflètent les observations enregistrées, pas une mesure exhaustive de tous les utilisateurs d’un moteur.
- **Trafic** : impressions, clics, positions agrégées, sessions et événements clés viennent des API Google après connexion et synchronisation. Avant cela : « — » et « non connecté ». La couverture par date et site accompagne les totaux. Les détails par requête Search Console ne sont pas additionnés pour fabriquer le total du site.
- **Leads** : zéro fiche initiale. Saisie ou import CSV avec source, identifiant externe et preuve. Une attribution GEO exige une explication (référent, UTM ou déclaration du prospect). Une session issue d’un référent IA et un événement clé GA4 ne créent jamais automatiquement un lead.
- **Équipe** : seuls les comptes effectivement créés peuvent être responsables. Rôles administrateur, éditeur et lecteur appliqués côté API.

Le HTML initial ne prouve ni le rendu final JavaScript, ni l’indexation Google, ni les performances, ni la validité des données structurées. Certaines applications renvoient un même shell HTML pour plusieurs routes. L’inventaire n’est pas une garantie d’exhaustivité et ne parcourt pas les espaces privés.

Le PDF mentionne également des classeurs externes (240 expressions, 30 familles et 30 questions notamment) qui ne sont pas incorporés au PDF : ils ne sont pas présentés comme récupérés. Les anciennes données fictives et l’ancien code TanStack sont archivés sous `legacy/`, exclus de l’application et des tests actifs.

## Brancher Search Console et GA4

Les connecteurs sont implémentés, mais **aucun compte Google réel n’est connecté par défaut**. Il faut un compte autorisé à lire les propriétés concernées et un projet Google Cloud appartenant à l’équipe.

1. Activer **Google Search Console API**, **Google Analytics Data API** et **Google Analytics Admin API** dans ce projet.
2. Configurer l’écran de consentement OAuth (et les utilisateurs de test si l’application est en test), puis créer un client OAuth de type application Web.
3. Ajouter l’URI de redirection exacte `http://localhost:3000/api/google/callback` pour le développement. Pour l’hébergement, utiliser le domaine HTTPS réel.
4. Dans `.env`, renseigner `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` et conserver `TOKEN_ENCRYPTION_KEY`. Ne jamais mettre ces valeurs dans le code ni dans une variable `NEXT_PUBLIC_*`. Redémarrer l’API.
5. Se connecter comme administrateur, ouvrir **Connexions**, autoriser Google et laisser l’autopilote associer les propriétés accessibles aux sites suivis. Une propriété de domaine Search Console peut couvrir plusieurs sous-domaines ; les requêtes sont filtrées sur l’hôte exact du site. Les correspondances déjà définies sont conservées.
6. Consulter l’historique pour connaître le résultat, le nombre de lignes et les erreurs éventuelles. L’autopilote synchronise Search Console avec son délai de disponibilité et GA4 à J-1 ; un lancement manuel reste possible pour un contrôle ciblé.

Les autorisations demandées sont en lecture seule. Les jetons OAuth sont chiffrés en base ; le navigateur ne reçoit pas les secrets. L’autopilote déclenche une synchronisation après connexion puis périodiquement ; les périodes relancées actualisent leurs lignes sans les additionner une seconde fois. Les échecs conservent les données précédentes. Les délais de disponibilité, limites de lignes et restrictions de Google restent applicables ; les messages de synchronisation signalent les limites identifiées.

Une propriété déjà synchronisée ne peut pas être remplacée depuis l’interface : cela évite de mélanger deux historiques. Une migration explicite est nécessaire pour changer de source. Il n’y a pas encore de gestion multi-organisations, d’outil de révocation des connexions, de réinitialisation de mot de passe par email ou d’exécution automatique des moteurs IA.

Documentation officielle : [Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1), [OAuth pour application serveur](https://developers.google.com/identity/protocols/oauth2/web-server).

## Leads et CRM

Le CRM utilisé par AMBS n’a pas encore été identifié. Aucun connecteur CRM fictif n’est annoncé. « Connexions » propose un modèle CSV vide et un import contrôlé, compatible avec un futur export CRM.

Colonnes : `externalId,company,date,source,channel,url,value,status,attributionEvidence`. Séparateur virgule, UTF-8, date `AAAA-MM-JJ`, URL de preuve HTTPS. Sources : `SEO`, `GEO`, `Direct`, `Référent`. Statuts : `Nouveau`, `Qualifié`, `Rendez-vous`, `Proposition`, `Client`, `Perdu`. `attributionEvidence` est obligatoire pour GEO. Maximum 5 000 lignes par import.

Le triplet site / nom du système source / identifiant externe rend le réimport idempotent : utiliser le même nom de source d’un import à l’autre. Le réimport remplace les champs des fiches correspondantes et conserve leur responsable déjà attribué. Les fiches sans identifiant ou preuve sont refusées. N’importer que des contacts que l’équipe est autorisée à traiter.

## Crawl, pages et backlinks

Le hub découvre automatiquement les URL publiques déclarées dans les sitemaps et `robots.txt`, puis
relève leur état HTTP, title, meta description, H1/H2, canonique, liens internes, images et JSON-LD.
Le score affiché est strictement technique : il ne prétend pas mesurer une position Google ni la
qualité éditoriale. Les clics d'une page sont mis à jour depuis Search Console quand la source est
reliée. L'indexation n'est jamais déduite du crawl HTML : elle reste à vérifier tant qu'elle n'est pas
confirmée côté Google.

Les backlinks exigent un fournisseur spécialisé. Le connecteur DataForSEO est optionnel et déclenché
manuellement pour éviter une consommation de crédit involontaire. Renseigner côté serveur uniquement
`DATAFORSEO_LOGIN` et `DATAFORSEO_PASSWORD`; les lignes importées conservent leur URL source et leur
date de relevé. Sans cette connexion, l'interface indique clairement l'absence de source plutôt que
d'afficher des données fictives.

## Rubriques

Vue générale, Sites & Liens, SEO, GEO, Mots-clés, Prompts, Actions, Contenus, Audit, Backlinks, Concurrents, Leads, Rapports, Connexions, Paramètres. Les actions peuvent être reliées aux mots-clés, prompts et pages ; les audits documentent les contrôles et les preuves. Les concurrents disposent d'un relevé public automatisable (disponibilité, redirections et structure HTML). Les positions, part de voix, backlinks et citations IA demandent des fournisseurs dédiés et ne sont pas estimés. Exports CSV et rapport PDF incluent le périmètre et les limites de mesure. L’export JSON des paramètres est un export du référentiel, pas une sauvegarde complète de PostgreSQL.

## Structure et exploitation

- `src/app/` : routes Next.js ; `src/views/` : écrans ; `src/components/` : interface.
- `server/` : API Express, authentification, droits, validation, connecteurs, import et relevés HTML.
- `db/migrations/` : migrations SQL versionnées, transactionnelles.
- `src/lib/demo/` : nom historique du dossier de types, référentiel et suivi partagé ; les générateurs fictifs ont été retirés du runtime.
- `legacy/` : ancien frontend et jeux fictifs archivés, non utilisés.
- `.data/` et `.env` : données locales et secrets, ignorés par Git.

Pour compiler et lancer en mode production :

```sh
npm run build
npm start
```

Avant une exposition publique : configurer `APP_ORIGIN` et `GOOGLE_REDIRECT_URI` sur le domaine HTTPS, garder l’API privée derrière Next.js, utiliser une base protégée et sauvegardée, et fournir `SETUP_TOKEN` pour la création du premier administrateur. Les cookies de session exigent HTTPS en production. Les deux processus API et Next.js doivent rester actifs ; les scripts `start`/`dev` lancent les deux et les arrêtent ensemble. Aucun déploiement n’est effectué par ces commandes.

Sauvegarder PostgreSQL (par exemple avec `pg_dump -Fc` vers un emplacement privé) et la clé de chiffrement séparément. Tester une restauration sur une base distincte. Ne pas supprimer `.data` pour « réinitialiser » l’application : cela détruirait les comptes, sources, observations et actions. Les migrations de structure passent par `db/migrations/`, jamais par une modification manuelle de la base de production.

## Vérifications

```sh
npm run typecheck
npm test
npm run test:db:prepare
npm run test:api
npm run build
```

Les tests API utilisent exclusivement `ambs_hub_test`, dans le cluster local du projet, et refusent la base de travail. Ils couvrent les sessions, rôles, conflits d’écriture, persistance, provenance, absence de données fictives et contrats des connecteurs. Les réponses Google sont **simulées dans les tests uniquement** : ces tests ne prouvent pas une connexion réelle à vos consoles. Les vérifications HTTP locales ne remplacent pas la validation visuelle ; le navigateur automatisé était indisponible durant cette intervention.
