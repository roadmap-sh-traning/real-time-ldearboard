import { MatchRepository } from "../ports/outbound/match.repository";
import { PlayerRepository } from "../ports/outbound/player.repository";
import { ScoreEventRepository } from "../ports/outbound/score-event.repository";
import { EventPublisher } from "../ports/outbound/event-publisher.port";
import { GameHandler } from "./game-handler-registry";
import { gameTypes } from "../../domain/game-type";
import { ScoreTrackingGameHandler } from "./handlers/score-tracking-game.handler";

export function createDefaultGameHandlers(
  players: PlayerRepository,
  matches: MatchRepository,
  scoreEvents: ScoreEventRepository,
  events: EventPublisher,
): GameHandler[] {
  return gameTypes.map(
    (gameType) =>
      new ScoreTrackingGameHandler(
        gameType,
        players,
        matches,
        scoreEvents,
        events,
      ),
  );
}
