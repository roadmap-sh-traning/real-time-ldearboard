## Real-time penalty kicks & leaderboard

This project is a Fastify + WebSocket backend with a PixiJS frontend for a real-time penalty-kicks game and global leaderboard.

### Features

- **Penalty-kicks game (PixiJS 2D)**: a 4-zone goal, animated ball and keeper, and kick results driven entirely by a server-side prize sequence.
- **Server-driven prize sequences**: Excel uploads define the win/loss pattern and prize/stake amounts per kick; the client only sends the kick direction.
- **Wallet integration**: wins credit the main wallet; losses debit the game wallet using a ledger-backed wallet service.
- **Live leaderboard**: a `/ws/leaderboard` WebSocket pushes snapshots so the sidebar leaderboard always stays up to date.

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
npm run dev
```

Then open `http://localhost:5173/penalty/` to play the game against your local API.

### Gameplay flow

1. **Login / register** in the left sidebar (the client stores a JWT and uses it for HTTP + WS).
2. **Upload an Excel prize sequence** (`POST /api/penalty-kicks/prize-sequence` under the hood). The UI shows the returned `sequenceId`.
3. **Start match**: the client opens `/ws/game`, then sends a `join` message with `matchId`, `gameType: "penalty-kicks"`, and the `sequenceId`.
4. **Server initializes progress** for that sequence and publishes `player.joined` with `totalSteps` so the HUD shows remaining kicks.
5. **Take kicks**: each click on a goal zone sends a `penalty-kick` message with `directionIndex` (0–3). The server:
   - Uses the next prize-sequence step to decide win/loss and amount.
   - Credits or debits wallets accordingly.
   - Publishes a `penalty-kick.result` event with balances and remaining steps.
6. **Leaderboard updates**: on wins, the server also emits `score.updated`; a Redis-backed leaderboard aggregates scores and pushes snapshots over `/ws/leaderboard`.

### Key endpoints and sockets

- **HTTP**
  - `POST /api/penalty-kicks/prize-sequence` – upload Excel and create a prize sequence.
  - `GET /api/penalty-kicks/prize-sequence?sequenceId=...` – inspect a sequence.
  - `GET /penalty` – redirects to the built PixiJS client at `/penalty/` when built for production.
- **WebSockets**
  - `GET /ws/game` – game messages (`join`, `penalty-kick`, `leave`) and events (`player.joined`, `penalty-kick.result`, `score.updated`).
  - `GET /ws/leaderboard` – live leaderboard snapshots.

### Available scripts (root)

- `npm run dev` – start Fastify in development (HTTP + WS, no frontend build).
- `npm run build:ts` – compile the TypeScript backend.
- `npm run test` – run the test suite.

Additional convenience scripts may exist in `package.json` (for example to run the client or Docker); check that file for the most up-to-date list.

### ROADMAP.SH

TASK_FROM=https://roadmap.sh/projects/realtime-leaderboard-system
