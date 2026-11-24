# Déploiement Dokploy — AMBS Visibility Hub

## Service

- Type : **Compose** (`docker-compose.yml`)
- Branche : `main`
- Dockerfile : `Dockerfile`
- Port interne : `3000`
- Domaine : `analytics.ambs-agency.com`
- HTTPS : activé par Dokploy / Traefik

L'image lance le site Next.js sur le port `3000` et l'API Express sur `127.0.0.1:4000`. Le proxy Next transmet automatiquement les requêtes `/api/*` à cette API interne ; ne pas exposer le port `4000` publiquement.

## Variables Dokploy requises

```env
POSTGRES_DB=analytics_ambs
POSTGRES_USER=analytics
POSTGRES_PASSWORD=un-mot-de-passe-fort
APP_ORIGIN=https://analytics.ambs-agency.com
TOKEN_ENCRYPTION_KEY=une-cle-aleatoire-de-32-octets-minimum
SETUP_TOKEN=un-jeton-aleatoire
```

`API_PORT=4000`, `API_HOST=127.0.0.1` et `API_INTERNAL_URL=http://127.0.0.1:4000` sont déjà définies dans l'image.

Pour connecter Google Search Console plus tard, ajouter également :

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://analytics.ambs-agency.com/api/google/callback
```

## Crawl et backlinks

Le crawler public découvre les URL déclarées dans `robots.txt` et les sitemaps, relève le HTML et
met à jour les fiches Pages sans parcourir les espaces privés. Il se déclenche au plus une fois par
site et par jour par défaut. Pour modifier ce rythme :

```env
AUTO_CRAWL_INTERVAL_HOURS=24
```

Pour importer de vrais backlinks, créer un compte DataForSEO puis ajouter ses identifiants API dans
Dokploy. Cette source est facturée à l'usage : ne pas lancer des synchronisations de masse sans
contrôler le crédit du compte.

```env
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```

Ces valeurs restent exclusivement sur le service API ; elles ne doivent jamais être préfixées par
`NEXT_PUBLIC_` ni ajoutées à un fichier client.

`SETUP_TOKEN` est uniquement requis pour créer le premier compte en production ; le retirer après cette étape.

## Base PostgreSQL

Le service `postgres` et le volume persistant `analytics-postgres-data` sont
créés par le fichier Compose. Au démarrage, l'API applique ses migrations et
initialise les données nécessaires. Le healthcheck Docker appelle `/api/health`,
qui valide aussi la connexion PostgreSQL.
