import { GameCommandPort } from "../ports/inbound/game-command.port";
import { PlayerRepository } from "../ports/outbound/player.repository";
import { MatchRepository } from "../ports/outbound/match.repository";
import { ScoreEventRepository } from "../ports/outbound/score-event.repository";
import { EventPublisher } from "../ports/outbound/event-publisher.port";
import {
  GameHandlerRegistry,
  GameHandlerResolver,
  JoinMatchCommand,
  LeaveMatchCommand,
  SubmitPenaltyKickCommand,
  SubmitScoreCommand,
} from "./game-handler-registry";
import { WalletService } from "../../../wallet/application/services/wallet.service";
import { createDefaultGameHandlers } from "./default-game-handlers";

export class GamesService implements GameCommandPort {
  constructor(private readonly handlers: GameHandlerResolver) {}

  async joinMatch(input: JoinMatchCommand): Promise<void> {
    return this.handlers.getHandler(input.gameType).joinMatch(input);
  }

  async submitScore(input: SubmitScoreCommand): Promise<void> {
    return this.handlers.getHandler(input.gameType).submitScore(input);
  }

  async submitPenaltyKick(input: SubmitPenaltyKickCommand): Promise<void> {
    return this.handlers.getHandler(input.gameType).submitPenaltyKick(input);
  }

  async leaveMatch(input: LeaveMatchCommand): Promise<void> {
    return this.handlers.getHandler(input.gameType).leaveMatch(input);
  }
}

export class GameService extends GamesService {
  constructor(
    players: PlayerRepository,
    matches: MatchRepository,
    scoreEvents: ScoreEventRepository,
    events: EventPublisher,
    wallets: WalletService,
  ) {
    super(
      new GameHandlerRegistry(
        createDefaultGameHandlers(
          players,
          matches,
          scoreEvents,
          events,
          wallets,
        ),
      ),
    );
  }
}
