# HushKey Vault — Migration Plan: Supabase → Self-Hosted Stack

## Overview

Migrate from Supabase (hosted BaaS) to a fully self-hosted stack using the same
open-source components Supabase is built on. The frontend code remains nearly
unchanged because `@supabase/supabase-js` speaks the same protocol to both
hosted Supabase and self-hosted PostgREST + GoTrue.

### Target Stack

| Service | Image | Role |
|---------|-------|------|
| PostgreSQL 16 | `postgres:16-alpine` | Database + RLS |
| GoTrue | `supabase/gotrue:v2.151.0` | Auth (email/password, JWT) |
| PostgREST | `postgrest/postgrest:v12.2.3` | Auto-generated REST API |
| Worker | Custom (Node + Hono) | Email sending, admin ops |
| MinIO | `minio/minio` | S3-compatible file storage |
| Caddy | `caddy:2-alpine` | Reverse proxy, TLS, CORS |

### Contributor Experience (after migration)

```bash
git clone https://github.com/user/hushkey.git
cd hushkey
docker compose up -d   # Backend ready in ~15 seconds
npm install
npm run dev            # Frontend at http://localhost:5173
```

---

## Phase 0 — Project Structure

Set up the directory layout for the self-hosted infrastructure.

```
hushkey/
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── .env.example
│   ├── postgres/
│   │   ├── Dockerfile
│   │   └── init/
│   │       ├── 00_extensions.sql
│   │       ├── 01_roles.sql
│   │       ├── 02_auth_helpers.sql
│   │       └── 03_app_schema.sql
│   ├── worker/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       └── index.ts
│   ├── caddy/
│   │   └── Caddyfile
│   └── minio/
│       └── init-bucket.sh
├── db/                    # Existing migrations (unchanged)
├── src/                   # Frontend (minimal changes)
└── .env.example           # Updated
```

### Action Items

- [ ] Create `docker/` directory structure
- [ ] Move infrastructure concerns out of root into `docker/`
- [ ] Add `docker/` and `.hushkey/` to `.gitignore`
- [ ] Update root `.env.example` with self-host configuration section

---

## Phase 1 — Docker Compose (Core Infrastructure)

Write the Docker Compose file that orchestrates all services.

### Architecture

```
Internet/localhost → Caddy (:8000)
                       ├── /rest/v1/*    → PostgREST (:3000)
                       ├── /auth/v1/*    → GoTrue (:9999)
                       ├── /functions/v1/* → Worker (:4000)
                       └── /storage/v1/* → MinIO (:9000)
```

### Action Items

- [ ] Write `docker/docker-compose.yml` with all 6 services
- [ ] Add health checks for each service (pg_isready, HTTP checks)
- [ ] Configure `depends_on` with `condition: service_healthy` for correct startup order
- [ ] Write `docker/docker-compose.dev.yml` with dev overrides (exposed ports, volumes)
- [ ] Write `docker/.env.example` with all required environment variables
- [ ] Generate default JWT secret and anon key for local development
- [ ] Add named volumes for persistent data (postgres_data, minio_data)
- [ ] Test `docker compose up -d` starts all services cleanly on fresh machine
- [ ] Test `docker compose down -v` cleanly removes everything

---

## Phase 2 — Database Initialization

On first boot, the database must have: extensions, roles, auth schema (via GoTrue),
the `auth.uid()` helper function, and all application tables with RLS.

### The `auth.uid()` Shim

PostgREST sets JWT claims as a PostgreSQL GUC (`request.jwt.claims`). Your existing
RLS policies call `auth.uid()`. This function bridges the two:

```sql
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::json->>'sub',
    nullif(current_setting('request.jwt.claims', true), '')::json->>'user_id'
  )::uuid;
$$ LANGUAGE sql STABLE;
```

### PostgreSQL Roles

```sql
-- Roles that PostgREST switches between based on JWT
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

-- The role PostgREST connects as
CREATE ROLE authenticator LOGIN PASSWORD 'changeme' NOINHERIT;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
```

### Action Items

- [ ] Write `docker/postgres/init/00_extensions.sql` (uuid-ossp, pgcrypto)
- [ ] Write `docker/postgres/init/01_roles.sql` (anon, authenticated, service_role, authenticator)
- [ ] Write `docker/postgres/init/02_auth_helpers.sql` (auth schema + `auth.uid()` function)
- [ ] Write `docker/postgres/init/03_app_schema.sql` (combine all 7 db/*.sql files into one init script)
- [ ] Verify GoTrue creates its `auth.users` table before app schema references it
- [ ] Handle startup ordering: GoTrue must be healthy before app migrations run
- [ ] Add a `db-migrate` init container or entrypoint script that applies migrations
- [ ] Test: create user via GoTrue → verify `auth.users` row exists → verify RLS works
- [ ] Test: all existing RLS policies pass with PostgREST JWT claims

---

## Phase 3 — GoTrue Configuration (Auth)

GoTrue is Supabase's auth server. It handles signup, login, JWT issuance,
email verification, and password reset.

### Key Environment Variables

```env
GOTRUE_DB_DRIVER=postgres
GOTRUE_DB_DATABASE_URL=postgres://gotrue:password@db:5432/hushkey
GOTRUE_JWT_SECRET=your-super-secret-jwt-key-min-32-chars
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true          # Set false in production
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=465
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_PASS=${RESEND_API_KEY}
GOTRUE_SMTP_ADMIN_EMAIL=noreply@hushkey.app
GOTRUE_SITE_URL=http://localhost:5173
API_EXTERNAL_URL=http://localhost:8000
```

### `supabase-js` Compatibility

The `@supabase/supabase-js` auth module sends requests to `/auth/v1/*`. Caddy
routes these to GoTrue. The client doesn't know or care it's self-hosted.

### Action Items

- [ ] Configure GoTrue service in Docker Compose with all required env vars
- [ ] Set JWT secret (shared with PostgREST — critical for token validation)
- [ ] Configure SMTP settings for email verification and password reset
- [ ] Set `GOTRUE_MAILER_AUTOCONFIRM=true` for dev, `false` for production
- [ ] Create GoTrue's database user and grant it access to `auth` schema
- [ ] Verify `supabase.auth.signUp()` works against self-hosted GoTrue
- [ ] Verify `supabase.auth.signInWithPassword()` works
- [ ] Verify `supabase.auth.signOut()` works
- [ ] Verify `supabase.auth.getSession()` returns valid session
- [ ] Verify `supabase.auth.getUser()` returns user object
- [ ] Verify JWT token contains `sub` claim with user UUID
- [ ] Verify token refresh works (auto-refresh in supabase-js)
- [ ] Test email verification flow (if autoconfirm is disabled)
- [ ] Test password reset flow

---

## Phase 4 — PostgREST Configuration (REST API)

PostgREST auto-generates a REST API from your PostgreSQL schema. It validates
JWTs issued by GoTrue and sets the appropriate role for RLS enforcement.

### Key Configuration

```env
PGRST_DB_URI=postgres://authenticator:changeme@db:5432/hushkey
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=anon
PGRST_JWT_SECRET=your-super-secret-jwt-key-min-32-chars  # Same as GoTrue
PGRST_DB_USE_LEGACY_GUCS=false
PGRST_OPENAPI_SERVER_PROXY_URI=http://localhost:8000/rest/v1
```

### How It Works With `supabase-js`

```
supabase.from('vaults').select('*').eq('user_id', userId)
    ↓
GET /rest/v1/vaults?user_id=eq.{userId}
    ↓
PostgREST → sets role to 'authenticated' → executes query → RLS filters results
```

### Action Items

- [ ] Configure PostgREST service in Docker Compose
- [ ] Set JWT secret (must match GoTrue exactly)
- [ ] Set `authenticator` role as the connection user
- [ ] Verify basic CRUD: `select`, `insert`, `update`, `delete` on all tables
- [ ] Verify `upsert` works (used in `saveUserProfile`, `saveDevice`, `saveUserSettings`)
- [ ] Verify `.select('*').eq().single()` returns single row
- [ ] Verify `.select('id', { count: 'exact', head: true })` returns count
- [ ] Verify `!inner` join syntax works (used in `getAllItems`, `getFavoriteItems`, `getVaultItemCounts`)
- [ ] Verify `.is('deleted_at', null)` filter works
- [ ] Verify `.in('vault_id', vaultIds)` filter works
- [ ] Verify `.order()` and `.limit()` work
- [ ] Verify RLS blocks cross-user access (user A cannot read user B's vaults)
- [ ] Verify unauthenticated requests get `anon` role (needed for public share access)
- [ ] Test the shares table public read policy (anonymous users can read by token)
- [ ] Verify PostgREST returns proper error codes (PGRST116 for not found, etc.)

---

## Phase 5 — Worker Service (Edge Function Replacement)

Replace Supabase Edge Functions with a lightweight HTTP service. This handles
operations that require server-side secrets or admin privileges.

### Responsibilities

1. **POST /functions/v1/send-email** — Send notification emails via Resend API
2. **POST /functions/v1/delete-user-account** — Delete user via GoTrue admin API

### Implementation (Hono + Node)

```typescript
// docker/worker/src/index.ts
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

const app = new Hono();

app.use('/*', jwt({ secret: process.env.JWT_SECRET! }));

app.post('/functions/v1/send-email', async (c) => {
  const { to, subject, html } = await c.req.json();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'HushKey Vault <security@hushkey.app>',
      to: [to], subject, html,
    }),
  });
  return c.json(await res.json(), res.status);
});

app.post('/functions/v1/delete-user-account', async (c) => {
  const payload = c.get('jwtPayload');
  const { userId } = await c.req.json();
  if (payload.sub !== userId) return c.json({ error: 'Forbidden' }, 403);

  await fetch(`${process.env.GOTRUE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.GOTRUE_SERVICE_KEY}` },
  });
  return c.json({ success: true });
});

export default app;
```

### Action Items

- [ ] Create `docker/worker/` directory with Dockerfile, package.json, tsconfig
- [ ] Implement `send-email` endpoint (validate JWT, call Resend API)
- [ ] Implement `delete-user-account` endpoint (validate JWT, call GoTrue admin API)
- [ ] Add graceful fallback when `RESEND_API_KEY` is not set (log email to console)
- [ ] Write Dockerfile (Node 20 alpine, multi-stage build)
- [ ] Add worker service to Docker Compose
- [ ] Configure Caddy to route `/functions/v1/*` to worker
- [ ] Verify `supabase.functions.invoke('send-email', ...)` works via Caddy routing
- [ ] Verify `supabase.functions.invoke('delete-user-account', ...)` works
- [ ] Test: email actually sends when Resend key is configured
- [ ] Test: account deletion cascades properly (RLS + FK cascades)

---

## Phase 6 — File Storage (MinIO)

Replace Supabase Storage with MinIO (S3-compatible). The existing
`S3StorageProvider` in `src/services/storage/s3Provider.ts` works unchanged —
just point it at MinIO.

### Configuration

```env
VITE_STORAGE_PROVIDER=s3
VITE_STORAGE_BUCKET=hushkey-vault
VITE_STORAGE_ENDPOINT=http://localhost:9000
VITE_STORAGE_ACCESS_KEY=minioadmin
VITE_STORAGE_SECRET_KEY=minioadmin
VITE_STORAGE_REGION=us-east-1
```

### Action Items

- [ ] Add MinIO service to Docker Compose
- [ ] Write `docker/minio/init-bucket.sh` to create `hushkey-vault` bucket on first boot
- [ ] Configure MinIO with default credentials for dev
- [ ] Verify existing `S3StorageProvider` connects to MinIO successfully
- [ ] Test file upload (encrypted blob → MinIO)
- [ ] Test file download (MinIO → decrypt → return)
- [ ] Test file deletion
- [ ] Guard `initializeBucket()` in `fileStorage.ts` to only run when provider is `supabase`
- [ ] Update `.env.example` with MinIO configuration
- [ ] Add production note: change MinIO credentials, enable TLS

---

## Phase 7 — Frontend Changes

Minimal code changes required. The `@supabase/supabase-js` client works against
self-hosted PostgREST + GoTrue without modification. Only edge function calls
need updating.

### Changes Required

| File | Change | Lines |
|------|--------|-------|
| `src/services/notificationService.ts` | Route email calls through Caddy (already works if path matches) | 0* |
| `src/services/database.ts` | `deleteUserAccount()` — same as above | 0* |
| `src/services/fileStorage.ts` | Guard `initializeBucket()` with provider check | ~5 |
| `.env.example` | Add self-hosted configuration section | ~15 |
| `src/supabaseClient.ts` | No change (reads from env) | 0 |

*\* Zero changes if Caddy routes `/functions/v1/*` correctly — `supabase.functions.invoke()`
sends to `{SUPABASE_URL}/functions/v1/{name}` which Caddy forwards to the worker.*

### Action Items

- [ ] Verify `supabase.functions.invoke()` sends to correct path via Caddy
- [ ] If path doesn't match, create a thin wrapper that routes to `/functions/v1/`
- [ ] Guard `initializeBucket()` to skip when `VITE_STORAGE_PROVIDER !== 'supabase'`
- [ ] Update root `.env.example` with both Supabase and self-hosted configs
- [ ] Remove any hardcoded Supabase URLs (search codebase for `supabase.co`)
- [ ] Verify full user flow: signup → onboarding → create vault → add item → lock → unlock
- [ ] Verify sharing flow: create share → access via token (unauthenticated)
- [ ] Verify file attachment flow: upload → download → delete
- [ ] Verify notification flow: trigger security event → email sent
- [ ] Verify account deletion flow: delete account → all data removed

---

## Phase 8 — Developer Experience

Make the self-hosted setup frictionless for contributors.

### npm Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "backend:up": "docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d",
    "backend:down": "docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down",
    "backend:reset": "docker compose -f docker/docker-compose.yml down -v && docker compose -f docker/docker-compose.yml up -d",
    "backend:logs": "docker compose -f docker/docker-compose.yml logs -f",
    "backend:status": "docker compose -f docker/docker-compose.yml ps",
    "start": "npm run backend:up && npm run dev"
  }
}
```

### Action Items

- [ ] Add backend npm scripts to `package.json`
- [ ] Write `README.md` section: "Getting Started (Self-Hosted)"
- [ ] Write `CONTRIBUTING.md` with dev environment setup guide
- [ ] Document the two deployment modes (Supabase cloud vs self-hosted)
- [ ] Add a `docker/docker-compose.dev.yml` that exposes all ports for debugging
- [ ] Add seed data script for development (optional sample vaults/items)
- [ ] Create a `Makefile` as alternative to npm scripts
- [ ] Test full setup on fresh machine: Windows (WSL2), macOS, Linux
- [ ] Add CI workflow that spins up Docker Compose and runs smoke tests
- [ ] Document how to view logs for each service individually

---

## Phase 9 — Production Deployment

Documentation and configuration for deploying to a VPS or cloud server.

### Production Overrides

```yaml
# docker/docker-compose.prod.yml
services:
  caddy:
    environment:
      - DOMAIN=vault.yourdomain.com  # Enables auto-TLS
  gotrue:
    environment:
      - GOTRUE_MAILER_AUTOCONFIRM=false
  db:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Action Items

- [ ] Write `docker/docker-compose.prod.yml` with production overrides
- [ ] Configure Caddy for automatic HTTPS (Let's Encrypt)
- [ ] Document minimum VPS requirements (1 vCPU, 1GB RAM, 10GB disk)
- [ ] Document domain + DNS setup
- [ ] Document environment variable reference (all vars, what they do)
- [ ] Write backup strategy (pg_dump cron job, MinIO backup)
- [ ] Write update procedure (pull new images, restart)
- [ ] Document security hardening (change default passwords, restrict ports)
- [ ] Add restart policies (`restart: unless-stopped`) for all services
- [ ] Document monitoring options (health check endpoints, log aggregation)
- [ ] Optional: one-click deploy templates (Coolify, CapRover, Railway)

---

## Execution Order & Dependencies

```
Phase 0 (structure)
    │
    ▼
Phase 1 (docker-compose) ──────────────────────────┐
    │                                                │
    ▼                                                │
Phase 2 (database init) ◄───────────────────────────┘
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Phase 3        Phase 4        Phase 5
(GoTrue)      (PostgREST)    (Worker)
    │              │              │
    └──────────────┴──────────────┘
                   │
                   ▼
              Phase 6 (MinIO)
                   │
                   ▼
              Phase 7 (Frontend)
                   │
                   ▼
              Phase 8 (DX)
                   │
                   ▼
              Phase 9 (Production)
```

Phases 3, 4, and 5 can be worked on in parallel once Phase 2 is complete.

---

## Estimated Effort

| Phase | Effort | Parallel? |
|-------|--------|-----------|
| 0. Project structure | 1 hour | — |
| 1. Docker Compose | 3–4 hours | — |
| 2. Database init | 2–3 hours | — |
| 3. GoTrue config | 2–3 hours | Yes (with 4, 5) |
| 4. PostgREST config | 2–3 hours | Yes (with 3, 5) |
| 5. Worker service | 3–4 hours | Yes (with 3, 4) |
| 6. File storage | 1–2 hours | — |
| 7. Frontend changes | 1 hour | — |
| 8. DX polish | 2–3 hours | — |
| 9. Production docs | 2–3 hours | — |
| **Total** | **~20–25 hours** | |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| GoTrue JWT format differs from what PostgREST expects | High | Use same JWT secret; verify `sub` claim exists in token |
| `!inner` join syntax not supported by PostgREST version | Medium | Pin PostgREST v12+ which supports resource embedding |
| GoTrue doesn't create `auth.users` before app migrations run | High | Use health checks + init container ordering |
| MinIO S3 API incompatibility with `@aws-sdk/client-s3` | Low | MinIO is fully S3-compatible; well-tested |
| `supabase.functions.invoke()` path doesn't match Caddy routing | Medium | Verify path format; adjust Caddy rules or add client wrapper |
| Share access (unauthenticated) blocked by PostgREST | Medium | Ensure `anon` role has SELECT on shares table; RLS allows public read |
| Windows contributors can't run Docker | Low | Document WSL2 requirement; offer Supabase cloud as alternative |

---

## Success Criteria

- [ ] `docker compose up -d` starts all services with zero manual configuration
- [ ] New user can sign up, complete onboarding, create vaults, add items
- [ ] Existing `@supabase/supabase-js` calls work without code changes (except edge functions)
- [ ] RLS enforces user isolation (user A cannot access user B's data)
- [ ] Unauthenticated share access works via token
- [ ] File attachments upload/download correctly via MinIO
- [ ] Email notifications send when Resend key is configured
- [ ] Account deletion removes all user data
- [ ] App works offline (IndexedDB) and syncs when back online
- [ ] Total frontend code changes < 30 lines
