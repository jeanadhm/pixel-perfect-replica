# Consignes du projet AMBS

- Utiliser npm et `package-lock.json` pour gérer les dépendances.
- Conserver un historique Git partagé linéaire : ne pas forcer les push ni réécrire des commits déjà publiés.
- Ne pas modifier à la main les fichiers portant un en-tête de génération automatique. Le plugin TanStack Start génère `src/routeTree.gen.ts`.
- Ne pas ajouter ou modifier de migrations de base de données sans demande explicite concernant le schéma.
- Ne jamais placer de secrets dans le dépôt ni de clés privées dans le code navigateur.
- Conserver la séparation entre les données fictives de démonstration et le suivi opérationnel AMBS.
- Vérifier les changements avec `npm run typecheck`, `npm test` et `npm run build` selon leur portée.
