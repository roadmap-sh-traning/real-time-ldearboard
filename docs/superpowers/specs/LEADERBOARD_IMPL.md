# Real-time Global Leaderboard — Design

**Date:** 2026-05-21
**Status:** Approved (design phase)

## Goal

When a player earns points in a game, their lifetime score updates and a global top-100 leaderboard reflects that change in near-real-time across all connected clients.

## Scope

**In scope (v1):**
- Single global all-time leaderboard
- Cumulative lifetime points per player (sum of every `submitScore` delta the player has ever produced)
- Top-100 view, exposed via REST snapshot and WebSocket live stream
- Authenticated WS subscription (JWT, same as `/ws/game`)
- Postgres as source of truth; Redis sorted set as live index; Redis pub/sub for event fan-out
- Auto-rebuild of Redis from Postgres on cold start or empty sorted set

**Explicitly deferred (v2 or later):**
- Per-match leaderboards
- Time-windowed boards (daily / weekly)
- Viewer's own rank pushed over WS when outside top-100 (REST-only in v1: `GET /api/leaderboard/me`)
- Horizontal scaling beyond one Fastify node (architecture supports it; verification is v2)
- Tie-breaking rules beyond Redis' natural lexicographic tiebreak on member ID
- Authoritative anti-cheat / score validation rules

## Architecture

The leaderboard is its own bounded context: `src/feature/leaderboard/`. It does not know about the game feature directly. It only knows about `GameEvent`s arriving on the `EventPublisher` port. The game feature does not know the leaderboard exists.

The `EventPublisher` implementation is upgraded from in-memory `EventEmitter` to **Redis pub/sub**. This change is invisible to `GameService` (port is unchanged) and provides a natural fan-out boundary if processes are split later.

### Module layout

```
src/feature/leaderboard/
├── domain/
│   ├── leaderboard-entry.ts                       # { userId, name, score, rank }
│   └── leaderboard-snapshot.ts                    # { entries, updatedAt }
├── application/
│   ├── ports/
│   │   ├── inbound/
│   │   │   └── leaderboard-query.port.ts          # getTopN, getViewerRank
│   │   └── outbound/
│   │       ├── score-store.port.ts                # addScore, getTopN, getRank
│   │       └── leaderboard-broadcaster.port.ts    # push(snapshot)
│   └── services/
│       └── leaderboard.service.ts                 # subscribes to score.updated, throttles, broadcasts
└── infrastructure/
    ├── inbound/
    │   ├── http/leaderboard.routes.ts             # GET /api/leaderboard, GET /api/leaderboard/me
    │   └── websocket/ws-leaderboard.adapter.ts    # /ws/leaderboard
    └── outbound/
        ├── redis-score-store.ts                   # ZADD / ZREVRANGE / ZREVRANK
        ├── ws-leaderboard-broadcaster.ts          # holds subscriber socket set
        └── postgres-name-resolver.ts              # joins user names at flush time

src/feature/game/infrastructure/outbound/
└── redis-event-publisher.ts                       # replaces InMemoryEventPublisher

src/plugins/
└── redis.ts                                       # ioredis client + subscriber client decoration
```

### Ports

**Inbound to leaderboard:**
- `LeaderboardQueryPort` — `getTopN(n: number)`, `getViewerRank(userId: number)`.
  Implemented by `LeaderboardService`. Consumed by both `/api/leaderboard` route and `/ws/leaderboard` adapter for the initial snapshot.

**Outbound from leaderboard:**
- `ScoreStore` — `setScore(userId, newScore)`, `getTopN(n)`, `getRank(userId)`, `getScore(userId)`.
  Implemented by `RedisScoreStore`. `setScore` uses `ZADD` (absolute write, not increment) so duplicate pub/sub deliveries are idempotent.
- `LeaderboardBroadcaster` — `push(snapshot)`.
  Implemented by `WsLeaderboardBroadcaster` which owns the set of subscribed sockets.
- `NameResolver` — `resolveMany(userIds: number[]): Promise<Map<number,string>>`.
  Implemented by `PostgresNameResolver` over Drizzle.

### Unchanged

`GameService`, `GameCommandPort`, the game WS adapter, the `EventPublisher` port interface, the existing `PlayerRepository` port. The only game-side swap is `InMemoryEventPublisher → RedisEventPublisher`.

## Data Model

### Postgres — source of truth

```sql
CREATE TABLE player_scores (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id),
  score      BIGINT  NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_player_scores_score_desc ON player_scores (score DESC);
```

Separate from `users` to keep the auth bounded context clean. One row per player, lazily upserted the first time they score. Drizzle schema added to `src/schema.ts`.

### Redis — live index

| Key | Type | Purpose |
|-----|------|---------|
| `leaderboard:global` | sorted set | Members = stringified `userId`, scores = lifetime points |
| `events:game` | pub/sub channel | JSON-encoded `GameEvent` payloads |

No name cache in Redis. Names are joined from Postgres at flush time (max 100 rows, indexed PK lookup).

## Data Flow

### Write path (one score event)

```
WS msg → WsGameAdapter → GameService.submitScore
  1. PlayerRepository.save    → Drizzle UPSERT into player_scores
  2. EventPublisher.publish   → Redis PUBLISH events:game (JSON GameEvent)
```

The game feature is done. It only writes Postgres and publishes.

### Leaderboard reaction

```
Redis SUBSCRIBE events:game  (LeaderboardService is the subscriber)
  on event "score.updated":
    1. ScoreStore.setScore(playerId, newScore)  → ZADD leaderboard:global newScore playerId
    2. markDirty(); if no flush timer scheduled, schedule one 250ms ahead
```

The event payload carries the new absolute lifetime score (`newScore` field on `ScoreUpdatedEvent`). Using `ZADD` rather than `ZINCRBY` makes the operation idempotent — a duplicate delivery does not double-count.

### Flush (throttled broadcast)

```
flushTimer fires:
  1. ScoreStore.getTopN(100)            → ZREVRANGE leaderboard:global 0 99 WITHSCORES
  2. NameResolver.resolveMany(userIds)  → SELECT id, name FROM users WHERE id = ANY($1)
  3. Build LeaderboardSnapshot { entries, updatedAt }
  4. LeaderboardBroadcaster.push(snapshot) → write JSON to every subscribed socket
```

**Coalescing rule:** any number of score events inside the 250ms window produce exactly one broadcast. When idle, the next event re-arms the timer immediately, so latency floor is one event → one flush after ≤250ms.

### REST read path

```
GET /api/leaderboard
  → LeaderboardQueryPort.getTopN(100)  (same flow as flush steps 1+2+3)
  → 200 JSON snapshot
```

```
GET /api/leaderboard/me   (JWT-authenticated)
  → ZREVRANK leaderboard:global <userId>      → rank (0-based, +1 for display)
  → ZSCORE   leaderboard:global <userId>      → score
  → 200 { rank, score }  or  404 if not present
```

## Consistency & Failure Modes

Writes are ordered **Postgres → Redis ZINCRBY → Redis PUBLISH**. Postgres is the truth; Redis is a derived index.

| Failure point | Effect | Recovery |
|---|---|---|
| Postgres write fails | `submitScore` throws, WS error to player, no Redis write attempted | None — nothing was applied |
| Postgres ok, Redis ZADD fails | Postgres has the score; leaderboard stale for that player | Rebuild command re-syncs from Postgres |
| Postgres ok, Redis ok, PUBLISH fails | Stores are correct; broadcast misses | Next score event self-heals within 250ms |
| Redis pub/sub disconnect | ioredis auto-reconnects; events during the gap are lost to leaderboard | On reconnect, trigger rebuild |
| Leaderboard service crashes / restarts | Game keeps working; WS subscribers see stale data until reconnect | Process restart hydrates from Postgres |

**Hard rule:** a Redis failure must never block a score write. The game must keep working even if the leaderboard goes dark.

**Rebuild:** `npm run leaderboard:rebuild` scans `player_scores ORDER BY score DESC` and pipelines `ZADD`s into `leaderboard:global`. Auto-runs on Fastify startup when `ZCARD leaderboard:global == 0`.

## WS Protocol

**Endpoint:** `GET /ws/leaderboard` with JWT (same `fs.authenticate` hook as `/ws/game`).

**On connect:** server immediately sends the current top-100 snapshot.

**On every throttled flush:** server pushes the same shape.

**Client → server:** none. Read-only stream.

**Server → client message:**
```json
{
  "type": "snapshot",
  "entries": [
    { "rank": 1, "userId": 42, "name": "Alice", "score": 1234 }
  ],
  "updatedAt": "2026-05-21T10:30:00Z"
}
```

## Configuration

| Setting | Default | Source |
|---|---|---|
| Top-N size | 100 | constant `TOP_N` |
| Throttle window | 250ms | constant `FLUSH_DEBOUNCE_MS` |
| Redis URL | `redis://127.0.0.1:6379` | `process.env.REDIS_URL` |
| Pub/sub channel | `events:game` | constant |
| Sorted set key | `leaderboard:global` | constant |

`docker-compose.yml` to be added with Redis 7 service; verified `.env.example` updated.

## Testing Strategy

**Unit:**
- `LeaderboardService` with fake `ScoreStore`, fake `LeaderboardBroadcaster`, fake `NameResolver`. Asserts: throttle coalescing, snapshot shape, flush ordering.
- `RedisScoreStore` against a real Redis test container or `ioredis-mock`. Asserts: `ZADD` idempotency, `ZREVRANGE` ordering, `ZREVRANK` accuracy.

**Integration:**
- Spin up Postgres + Redis containers. Submit scores via `GameService`, assert REST snapshot reflects them within one flush window. Connect two WS clients, submit scores, assert both receive snapshots.

**Manual smoke:**
- `npm run dev`, register two users, connect each to `/ws/game`, submit scores, observe pushes on `/ws/leaderboard`.

## Open Decisions Confirmed

1. Top-N = 100.
2. Throttle = 250ms.
3. Postgres write is synchronous in `submitScore`; Redis is updated asynchronously via pub/sub by `LeaderboardService`.
4. Names joined from `users` at flush time. No Redis name cache.
5. Viewer-rank for non-top-N players: REST-only (`GET /api/leaderboard/me`). Not pushed over WS in v1.

## Dependencies to Add

- `ioredis` (runtime)
- `@types/ioredis` (dev)
- `testcontainers` or `ioredis-mock` (test) — chosen during implementation planning
