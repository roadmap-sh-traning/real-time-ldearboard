# Railway deployment & CLI link

## One-time: install CLI and link the repo

```powershell
npm install -g @railway/cli
cd c:\Users\lshinjikashvili\Desktop\side-projects\real-time-leaderboard
npm run railway:link
```

`railway link` will:

1. Open the browser to log in (if needed).
2. Ask you to pick a **project**.
3. Ask which **service** to link (choose your **app** / GitHub service, not Postgres or Redis).

Railway writes `.railway/` locally (git-ignored). After linking, CLI commands run in the context of that service.

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run railway:link` | Link this folder to a Railway project/service |
| `npm run railway:status` | Show linked project and service |
| `npm run railway:migrate` | Run Drizzle migrations using Railway `DATABASE_URL` |
| `npm run railway:logs` | Tail deployment logs |
| `npm run railway:deploy` | Deploy current directory (`railway up`) |

## Required service variables (on the **app** service)

Set these in the dashboard or via references from add-ons:

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Reference from **Postgres** → `DATABASE_URL` (private / `*.railway.internal`) |
| `DATABASE_PRIVATE_URL` | Optional alias — app prefers this when set |
| `REDIS_URL` | Reference from **Redis** → `REDIS_URL` |
| `JWT_SECRET` | Long random string |

Remove local-only values (`127.0.0.1`, port `5433`, `REDIS_HOST=127.0.0.1`).

If health checks fail but Redis works, the app is still using a bad DB URL. In deploy logs you want:

```text
Connecting to Postgres at postgres.railway.internal:5432/railway (ssl=false)
```

Not `127.0.0.1:5433`. Some Railway setups expose `DATABASE_PRIVATE_URL` — you can reference that instead:

```env
DATABASE_PRIVATE_URL=${{Postgres.DATABASE_URL}}
```

## Config file

`railway.toml` in the repo root defines:

- Docker build via `Dockerfile`
- `preDeployCommand`: `npm run db:migrate`
- Health check: `GET /status`
- Start command uses Railway `PORT`

Ensure the app service **Config file path** is `/railway.toml` (default when file is at repo root).

## Migrations without linking

```powershell
railway run npm run db:migrate
```

Must be run from a linked directory or with `RAILWAY_TOKEN` set.
