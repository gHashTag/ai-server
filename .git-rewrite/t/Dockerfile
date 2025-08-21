# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY .env ./

# Create logs and uploads directories with proper permissions
RUN mkdir -p /app/logs && \
    mkdir -p /app/dist/uploads && \
    chown -R node:node /app && \
    chown -R node:node /app/logs && \
    chown -R node:node /app/dist/uploads && \
    chmod 755 /app/logs && \
    chmod 775 /app/dist/uploads

# Switch to non-root user
USER node

EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/server.js"]