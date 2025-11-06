FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application (frontend + backend)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/db/migrations ./server/db/migrations

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/storynexus.db

# Start server
CMD ["node", "dist/server/index.js"]
