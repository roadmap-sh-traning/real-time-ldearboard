import { GameCommandPort } from "../ports/inbound/game-command.port";
import { GameType } from "../../domain/game-type";

export type JoinMatchCommand = Parameters<GameCommandPort["joinMatch"]>[0];
export type SubmitScoreCommand = Parameters<GameCommandPort["submitScore"]>[0];
export type SubmitPenaltyKickCommand = Parameters<
  GameCommandPort["submitPenaltyKick"]
>[0];
export type LeaveMatchCommand = Parameters<GameCommandPort["leaveMatch"]>[0];

export interface GameHandler extends GameCommandPort {
  readonly gameType: GameType;
}

export interface GameHandlerResolver {
  getHandler(gameType: GameType): GameCommandPort;
}

export class GameHandlerRegistry implements GameHandlerResolver {
  private readonly handlers = new Map<GameType, GameCommandPort>();

  constructor(handlers: ReadonlyArray<GameHandler>) {
    for (const handler of handlers) {
      if (this.handlers.has(handler.gameType)) {
        throw new Error(`Duplicate game handler: ${handler.gameType}`);
      }

      this.handlers.set(handler.gameType, handler);
    }
  }

  getHandler(gameType: GameType): GameCommandPort {
    const handler = this.handlers.get(gameType);
    if (!handler) {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    return handler;
  }
}
