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

## Deployment Instructions

### Docker / Docker Compose
The application provides a production-grade multi-stage `Dockerfile` (based on official Node LTS) and a `docker-compose.yml`.

To deploy via Docker Compose:
1. Create a `.env` file containing required production variables (`DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `NODE_ENV=production`).
2. Run `docker-compose up -d --build`.

**Note on Migrations**:
Database migrations (`npx prisma migrate deploy`) are intentionally *not* executed within the application container startup process to prevent race conditions during horizontal scaling. Migrations must be run as a separate step in your CI/CD pipeline or manually before the application starts.

## CI/CD Guidelines
A standard production pipeline should include:
1. **Validation**: `npm ci`, `npm run build`, `npx prisma validate`, and `npm run test` (gating failures).
2. **Migration**: Execute `npx prisma migrate deploy` against the target database.
3. **Build & Push**: Build the Docker container using the provided `Dockerfile` and push to your container registry.
4. **Deploy**: Update your orchestration platform (Docker Compose, ECS, etc.) to pull the latest image.

## Database Backup & Recovery
This application uses PostgreSQL. Use standard PostgreSQL tooling for backups:

- **Backup**: 
  `pg_dump -U bus_admin -F c -d bus_db > backup.dump`
- **Restore**:
  `pg_restore -U bus_admin -d bus_db -1 backup.dump`
