import { MatchRepository } from "../ports/outbound/match.repository";
import { PlayerRepository } from "../ports/outbound/player.repository";
import { ScoreEventRepository } from "../ports/outbound/score-event.repository";
import { EventPublisher } from "../ports/outbound/event-publisher.port";
import { WalletService } from "../../../wallet/application/services/wallet.service";
import { GameHandler } from "./game-handler-registry";
import { gameTypes } from "../../domain/game-type";
import { ScoreTrackingGameHandler } from "./handlers/score-tracking-game.handler";
import { PenaltyKicksGameHandler } from "./handlers/penalty-kicks-game.handler";
import { PenaltyKickPrizeSequenceService } from "./penalty-kick-prize-sequence.service";

const scoreTrackingGameTypes = gameTypes.filter(
  (gameType) => gameType !== "penalty-kicks",
);

export function createDefaultGameHandlers(
  players: PlayerRepository,
  matches: MatchRepository,
  scoreEvents: ScoreEventRepository,
  events: EventPublisher,
  wallets: WalletService,
  prizeSequences: PenaltyKickPrizeSequenceService,
): GameHandler[] {
  const handlers: GameHandler[] = scoreTrackingGameTypes.map(
    (gameType) =>
      new ScoreTrackingGameHandler(
        gameType,
        players,
        matches,
        scoreEvents,
        events,
      ),
  );

  handlers.push(
    new PenaltyKicksGameHandler(
      players,
      matches,
      scoreEvents,
      events,
      wallets,
      prizeSequences,
    ),
  );

  return handlers;
}
