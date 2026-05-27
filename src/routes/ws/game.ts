import { AppInstance } from "../../global";
import { GameService } from "../../feature/game/application/services/game.service";
import { DrizzlePlayerRepository } from "../../feature/game/infrastructure/outbound/drizzle-player.repository";
import { DrizzleMatchRepository } from "../../feature/game/infrastructure/outbound/drizzle-match.repository";
import { DrizzleScoreEventRepository } from "../../feature/game/infrastructure/outbound/drizzle-score-event.repository";
import { DrizzlePlayerSessionRepository } from "../../feature/game/infrastructure/outbound/drizzle-player-session.repository";
import { WsGameAdapter } from "../../feature/game/infrastructure/inbound/websocket/ws-game.adapter";
import { WalletService } from "../../feature/wallet/application/services/wallet.service";
import { DrizzleWalletLedgerRepository } from "../../feature/wallet/infrastructure/outbound/drizzle-wallet-ledger.repository";

export default async function gameWsRoutes(fs: AppInstance) {
  const players = new DrizzlePlayerRepository(fs.db);
  const matches = new DrizzleMatchRepository(fs.db);
  const scoreEvents = new DrizzleScoreEventRepository(fs.db);
  const sessions = new DrizzlePlayerSessionRepository(fs.db);

  const wallets = new WalletService(new DrizzleWalletLedgerRepository(fs.db));
  const service = new GameService(
    players,
    matches,
    scoreEvents,
    fs.gameEvents,
    wallets,
  );
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
