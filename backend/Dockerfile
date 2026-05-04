# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

# Set to production
ENV NODE_ENV=production

WORKDIR /app

# Install netcat (nc) for health checks in entrypoint
RUN apk add --no-cache netcat-openbsd

# Copy package manifests
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built/source files from builder
COPY --from=builder /app ./

# Create directories and set permissions for non-root user
# We need to ensure the 'node' user can write to logs and uploads
RUN mkdir -p logs uploads && \
    chown -R node:node /app

# Security: Set permissions for the entrypoint
RUN chmod +x docker-entrypoint.sh

# Security: Run as non-root user
USER node

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]

# Command to pass to entrypoint
CMD ["node", "src/index.js"]
