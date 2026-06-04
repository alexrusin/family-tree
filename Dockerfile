FROM node:24-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

ARG NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/family_tree?schema=public
ENV BETTER_AUTH_SECRET=build-only-secret
ENV BETTER_AUTH_URL=http://localhost:3001
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate && npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

CMD ["sh", "-c", "npx prisma migrate deploy && exec node server.js"]
