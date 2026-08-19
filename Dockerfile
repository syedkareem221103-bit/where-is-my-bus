# Stage 1: Build
FROM node:26-alpine AS builder

WORKDIR /app

# Install dependencies required for Prisma and native modules
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Stage 2: Production
FROM node:26-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production to enforce secure defaults
ENV NODE_ENV=production

# Install openssl for Prisma in production
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose API port
EXPOSE 4000

# Health Check (requires curl, but node alpine doesn't have it by default. 
# We'll use wget which is built into alpine/busybox)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/ready || exit 1

# Start the application
CMD ["node", "dist/server.js"]
