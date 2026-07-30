# Where Is My Bus - Backend

This is the Node.js / Express backend for the Where Is My Bus SaaS platform. 
Built using strict Clean Architecture, SOLID principles, and Multi-Tenant Isolation.

## Startup Instructions

### 1. Database
Ensure PostgreSQL is running and update `DATABASE_URL` in your `.env`.
Run `npx prisma db push` or `npx prisma migrate dev` to sync the schema.

### 2. Environment Configuration
The application enforces strict environment validation using Zod.
Failure to provide required configuration will result in an immediate fatal crash on startup.

**Production Requirements:**
In `NODE_ENV=production`, the application requires permanent asymmetric keys for JWT signing (ES256).
- `JWT_PRIVATE_KEY` (MUST be a P-256 PEM)
- `JWT_PUBLIC_KEY` (MUST be a P-256 PEM)

**Development / Test Environments:**
In `NODE_ENV=development`, the application can auto-generate ephemeral keys for local testing if you set:
`ALLOW_DEV_EPHEMERAL_KEYS=true`
*Note: Using ephemeral keys means all active user sessions will be invalidated every time the server restarts.*

To generate your own persistent keys for local development (recommended):
```bash
openssl ecparam -name prime256v1 -genkey -noout -out private.pem
openssl ec -in private.pem -pubout -out public.pem
```

### 3. Running the Server
```bash
npm install
npm run dev
```

## Health Endpoints
The application provides production-grade Kubernetes-ready health checks:
- `GET /health`: Returns basic Liveness stats (uptime, server status).
- `GET /ready`: Returns Readiness state (verifies database connectivity).

## Graceful Shutdown
The server listens for `SIGINT` and `SIGTERM` signals and correctly orchestrates a graceful shutdown:
1. Stops accepting new HTTP connections.
2. Closes active Socket.io sessions.
3. Clears EventBus memory.
4. Disconnects Prisma client safely.
A 10-second timeout acts as a fallback to force exit if processes hang.
