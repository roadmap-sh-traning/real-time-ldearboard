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
COPY public ./public
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

EXPOSE 3000

CMD ["npx", "fastify", "start", "-l", "info", "-p", "3000", "dist/app.js"]
