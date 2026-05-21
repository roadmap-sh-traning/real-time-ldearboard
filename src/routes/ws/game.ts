import { AppInstance } from "../../global";
import { GameService } from "../../feature/game/application/services/game.service";
import { InMemoryPlayerRepository } from "../../feature/game/infrastructure/outbound/in-memory-player.repository";
import { InMemoryMatchRepository } from "../../feature/game/infrastructure/outbound/in-memory-match.repository";
import { InMemoryEventPublisher } from "../../feature/game/infrastructure/outbound/in-memory-event-publisher";
import { WsConnectionRegistry } from "../../feature/game/infrastructure/inbound/websocket/ws-connection-registry";
import { WsGameAdapter } from "../../feature/game/infrastructure/inbound/websocket/ws-game.adapter";

export default async function gameWsRoutes(fs: AppInstance) {
  const players = new InMemoryPlayerRepository();
  const matches = new InMemoryMatchRepository();
  const events = new InMemoryEventPublisher();
  const registry = new WsConnectionRegistry();

  const service = new GameService(players, matches, registry, events);
  const adapter = new WsGameAdapter(service, registry, events);

  fs.get(
    "/ws/game",
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
