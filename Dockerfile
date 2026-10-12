FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies and generate Prisma client
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Ensure entrypoint is executable
RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["./scripts/docker-entrypoint.sh"]
