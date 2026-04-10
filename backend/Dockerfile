# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dbmate for migrations
RUN apk add --no-cache curl bash \
    && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v2.10.0/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy migrations and seed
COPY migrations ./migrations

# Install PostgreSQL client for seed
RUN apk add --no-cache postgresql-client

# Create entrypoint: migrations, idempotent seed (fail loud), then app
RUN echo '#!/bin/bash' > /app/entrypoint.sh \
    && echo 'set -euo pipefail' >> /app/entrypoint.sh \
    && echo 'echo "Running database migrations..."' >> /app/entrypoint.sh \
    && echo 'dbmate --url "$DATABASE_URL" --migrations-dir ./migrations up' >> /app/entrypoint.sh \
    && echo 'echo "Applying seed data (idempotent)..."' >> /app/entrypoint.sh \
    && echo 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ./migrations/seed.sql' >> /app/entrypoint.sh \
    && echo 'echo "Starting application..."' >> /app/entrypoint.sh \
    && echo 'exec node dist/main.js' >> /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

EXPOSE 3001

CMD ["/app/entrypoint.sh"]
