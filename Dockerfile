FROM node:24-alpine AS base
RUN npm install -g pnpm@9

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS production-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.js ./scripts/migrate.js
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.js && node node_modules/@react-router/serve/bin.js ./build/server/index.js"]
