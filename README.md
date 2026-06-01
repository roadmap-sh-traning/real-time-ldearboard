## Real-time penalty kicks & leaderboard

This project is a Fastify + WebSocket backend with a PixiJS frontend for a real-time penalty-kicks game and global leaderboard.

### Features

- **Penalty-kicks game (PixiJS 2D)**: a 4-zone goal, animated ball and keeper, and kick results driven entirely by a server-side prize sequence.
- **Server-driven prize sequences**: Excel uploads define the win/loss pattern and prize/stake amounts per kick; the client only sends the kick direction.
- **Wallet integration**: wins credit the main wallet; losses debit the game wallet using a ledger-backed wallet service.
- **Live leaderboard**: a `/ws/leaderboard` WebSocket pushes snapshots so the sidebar leaderboard always stays up to date.

### Railway (hosted deploy)

See [docs/railway.md](docs/railway.md) for linking the repo with the CLI and running migrations.

Quick start:

```bash
npm install -g @railway/cli
npm run railway:link
npm run railway:migrate
```

### Running the backend (API + WebSockets)

- `npm install`
- Start Postgres + Redis (for example via Docker Compose, if configured in your environment).
- Run migrations: `npm run db:migrate`
- Start the API: `npm run dev`
- Open `http://localhost:3000/dev/ws` for the developer WebSocket console (manual testing of `/ws/game` and `/ws/leaderboard`).

### Running the PixiJS frontend

The game UI lives under `client/` and is served (in dev) via Vite.

```bash
cd client
npm install
npm run sprites   # optional: regenerate pixel-art sprite sheets
npm run dev
```

Then open `http://localhost:5173/penalty/` to play the game against your local API.

### Gameplay flow

1. **Login / register** in the left sidebar (the client stores a JWT and uses it for HTTP + WS).
2. The server seeds a **default 100-kick sequence** on startup and links it to penalty-kicks. The client loads it after login (no upload required).
3. **Start match**: the client opens `/ws/game` and sends `join` with `gameType: "penalty-kicks"`. `sequenceId` is optional; the active sequence is used if omitted.
4. **Optional**: upload Excel to replace the active sequence (`POST /api/penalty-kicks/prize-sequence` activates it by default).
5. **Server initializes progress** for that sequence and publishes `player.joined` with `totalSteps` so the HUD shows remaining kicks.
6. **Take kicks**: each click on a goal zone sends a `penalty-kick` message with `directionIndex` (0–3). The server:
   - Uses the next prize-sequence step to decide win/loss and amount.
   - Credits or debits wallets accordingly.
   - Publishes a `penalty-kick.result` event with balances and remaining steps.
7. **Leaderboard updates**: on wins, the server also emits `score.updated`; a Redis-backed leaderboard aggregates scores and pushes snapshots over `/ws/leaderboard`.

### Key endpoints and sockets

- **HTTP**
  - `POST /api/penalty-kicks/prize-sequence` – upload Excel and create a prize sequence.
  - `GET /api/penalty-kicks/prize-sequence` – active linked sequence (or `?sequenceId=...` to inspect one).
  - `POST /api/penalty-kicks/prize-sequence/generate` – generate a big sequence (optional body: `{ "stepCount": 50 }`).
  - `PUT /api/penalty-kicks/prize-sequence/active` – link a sequence: `{ "sequenceId": "..." }`.
  - `GET /penalty` – redirects to the built PixiJS client at `/penalty/` when built for production.
- **WebSockets**
  - `GET /ws/game` – game messages (`join`, `penalty-kick`, `leave`) and events (`player.joined`, `penalty-kick.result`, `score.updated`).
  - `GET /ws/leaderboard` – live leaderboard snapshots.

### Available scripts (root)

- `npm run client:build` – build the PixiJS client into `public/penalty/` (required before Docker or production).
- `npm run dev` – start Fastify in development (HTTP + WS, no frontend build).
- `npm run build:ts` – compile the TypeScript backend.
- `npm run test` – run the test suite.

Additional convenience scripts may exist in `package.json` (for example to run the client or Docker); check that file for the most up-to-date list.

### ROADMAP.SH

TASK_FROM=https://roadmap.sh/projects/realtime-leaderboard-system
