FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

RUN npm install
RUN npm run build:packages
RUN npm --workspace=@schemapilot/backend run prisma:generate
RUN npm --workspace=@schemapilot/backend run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

EXPOSE 4000
CMD ["sh", "-c", "npx --workspace=@schemapilot/backend prisma db push && node apps/backend/dist/main.js"]
