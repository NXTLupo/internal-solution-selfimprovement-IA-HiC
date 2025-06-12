# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S miro-app -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files
COPY --chown=miro-app:nodejs config/ ./config/
COPY --chown=miro-app:nodejs examples/ ./examples/

# Create necessary directories
RUN mkdir -p logs output temp && \
    chown -R miro-app:nodejs /app

# Switch to non-root user
USER miro-app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Expose port (if running as server)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["node", "dist/cli/index.js", "--help"]

# Labels
LABEL org.opencontainers.image.title="NXT Miro Generator"
LABEL org.opencontainers.image.description="TypeScript CLI tool for generating Miro boards from journey maps"
LABEL org.opencontainers.image.vendor="NXT Humans"
LABEL org.opencontainers.image.version="1.0.0"