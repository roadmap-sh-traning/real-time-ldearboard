import { WebSocket } from "ws";
import { AppInstance } from "../../global";
import { LeaderboardService } from "../../feature/leaderboard/application/services/leaderboard.service";
import { RedisScoreStore } from "../../feature/leaderboard/infrastructure/outbound/redis-score-store";
import { WsLeaderboardBroadcaster } from "../../feature/leaderboard/infrastructure/outbound/ws-leaderboard-broadcaster";
import { PostgresNameResolver } from "../../feature/leaderboard/infrastructure/outbound/postgres-name-resolver";

export default async function leaderboardWsRoutes(fs: AppInstance) {
  const scoreStore = new RedisScoreStore(fs);
  const nameResolver = new PostgresNameResolver(fs.db);
  const broadcaster = new WsLeaderboardBroadcaster();
  const leaderboardService = new LeaderboardService(
    scoreStore,
    nameResolver,
    broadcaster,
    fs.gameEvents,
  );

  fs.get(
    "/leaderboard",
    { websocket: true, preHandler: fs.authenticate },
    (socket) => {
      broadcaster.subscribe(socket);

      void leaderboardService.getLeaderboard().then((snapshot) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(
          JSON.stringify({
            type: "snapshot",
            entries: snapshot.entries,
            updatedAt: snapshot.updatedAt,
          }),
        );
      });

      socket.on("close", () => {
        broadcaster.unsubscribe(socket);
      });
    },
  );
}
