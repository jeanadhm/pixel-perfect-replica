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

`SETUP_TOKEN` est uniquement requis pour créer le premier compte en production ; le retirer après cette étape.

## Base PostgreSQL

Le service `postgres` et le volume persistant `analytics-postgres-data` sont
créés par le fichier Compose. Au démarrage, l'API applique ses migrations et
initialise les données nécessaires. Le healthcheck Docker appelle `/api/health`,
qui valide aussi la connexion PostgreSQL.
