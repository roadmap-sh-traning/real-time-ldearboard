FROM node:22-alpine AS client-builder

WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run sprites && npm run build

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build:ts

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=client-builder /app/public/penalty ./public/penalty
COPY public/ws-console.html ./public/ws-console.html
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

EXPOSE 3000

CMD ["npx", "fastify", "start", "-l", "info", "-a", "0.0.0.0", "-p", "3000", "dist/app.js"]
