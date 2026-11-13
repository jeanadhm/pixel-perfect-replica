# TanStack Start / Nitro node server for Dokploy.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Lovable defaults to an edge target. Dokploy serves this application as a Node process.
ENV NITRO_PRESET=node_server
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Nitro's Node output is standalone: it contains the server, its chunks and public assets.
COPY --from=build /app/.output ./.output

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
