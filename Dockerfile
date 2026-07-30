# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20 AS runner

WORKDIR /app

# Set NODE_ENV to production to enforce secure defaults
ENV NODE_ENV=production

# Copy package files for installing only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client (needed in the runner stage as well)
RUN npx prisma generate

# Copy the built artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user and switch to it for security
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the default application port
EXPOSE 4000

# Start the application
CMD ["node", "dist/server.js"]
