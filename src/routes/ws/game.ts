import { AppInstance } from "../../global";
import { GameService } from "../../feature/game/application/services/game.service";
import { DrizzlePlayerRepository } from "../../feature/game/infrastructure/outbound/drizzle-player.repository";
import { DrizzleMatchRepository } from "../../feature/game/infrastructure/outbound/drizzle-match.repository";
import { DrizzlePlayerSessionRepository } from "../../feature/game/infrastructure/outbound/drizzle-player-session.repository";
import { WsGameAdapter } from "../../feature/game/infrastructure/inbound/websocket/ws-game.adapter";

export default async function gameWsRoutes(fs: AppInstance) {
  const players = new DrizzlePlayerRepository(fs.db);
  const matches = new DrizzleMatchRepository(fs.db);
  const sessions = new DrizzlePlayerSessionRepository(fs.db);

  const service = new GameService(players, matches, fs.gameEvents);
  const adapter = new WsGameAdapter(service, sessions, fs.redis);

  fs.get(
    "/game",
    { websocket: true, preHandler: fs.authenticate },
    (socket, request) => {
      const { sub, email } = request.user;
      adapter.handleConnection(socket, {
        playerId: sub,
        playerName: email,
      });
    },
  );
}
