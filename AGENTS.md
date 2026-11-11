# Consignes du projet AMBS

- Utiliser npm et `package-lock.json` pour gérer les dépendances.
- Conserver un historique Git partagé linéaire : ne pas forcer les push ni réécrire des commits déjà publiés.
- Ne pas modifier à la main les fichiers portant un en-tête de génération automatique. Next.js génère `.next/` et `next-env.d.ts`. Les anciens fichiers générés sont archivés sous `legacy/`.
- Ne pas ajouter ou modifier de migrations de base de données sans demande explicite concernant le schéma.
- Ne jamais placer de secrets dans le dépôt ni de clés privées dans le code navigateur.
- Ne jamais charger les données fictives de `legacy/` dans le suivi opérationnel AMBS. Toute métrique doit avoir une source et une période ; une donnée absente reste inconnue.
- Vérifier les changements avec `npm run typecheck`, `npm test`, `npm run test:api` (base de test isolée) et `npm run build` selon leur portée.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
