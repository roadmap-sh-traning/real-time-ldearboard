import { GameCommandPort } from "../ports/inbound/game-command.port";
import { PlayerRepository } from "../ports/outbound/player.repository";
import { MatchRepository } from "../ports/outbound/match.repository";
import { ScoreEventRepository } from "../ports/outbound/score-event.repository";
import { EventPublisher } from "../ports/outbound/event-publisher.port";
import {
  addPlayer,
  createMatch,
  Match,
  removePlayer,
  MatchId,
} from "../../domain/match";
import { GameType } from "../../domain/game-type";
import {
  applyScoreDelta,
  createPlayer,
  PlayerId,
} from "../../domain/player";

export class GameService implements GameCommandPort {
  constructor(
    private readonly players: PlayerRepository,
    private readonly matches: MatchRepository,
    private readonly scoreEvents: ScoreEventRepository,
    private readonly events: EventPublisher,
  ) {}

  async joinMatch(input: {
    playerId: PlayerId;
    playerName: string;
    matchId: MatchId;
    gameType: GameType;
  }): Promise<void> {
    const player =
      (await this.players.findById(input.playerId)) ??
      createPlayer(input.playerId, input.playerName);
    await this.players.save(player);

    const match = await this.getOrCreateMatch(input.matchId, input.gameType);
    const updated = addPlayer(match, input.playerId);
    await this.matches.save(updated);

    this.events.publish({
      type: "player.joined",
      matchId: input.matchId,
      gameType: updated.gameType,
      playerId: input.playerId,
      playerName: player.name,
      at: new Date(),
    });
  }

  async submitScore(input: {
    playerId: PlayerId;
    matchId: MatchId;
    gameType: GameType;
    delta: number;
  }): Promise<void> {
    const match = await this.matches.findById(input.matchId);
    if (!match || !match.playerIds.has(input.playerId)) {
      throw new Error("Player not in match");
    }
    this.assertGameType(match.gameType, input.gameType);

    const player = await this.players.findById(input.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const updated = applyScoreDelta(player, input.delta);
    await this.players.save(updated);
    await this.scoreEvents.append({
      userId: input.playerId,
      matchId: input.matchId,
      gameType: match.gameType,
      delta: input.delta,
      scoreAfter: updated.score,
    });

    this.events.publish({
      type: "score.updated",
      matchId: input.matchId,
      gameType: match.gameType,
      playerId: input.playerId,
      newScore: updated.score,
      at: new Date(),
    });
  }

  async leaveMatch(input: {
    playerId: PlayerId;
    matchId: MatchId;
    gameType: GameType;
  }): Promise<void> {
    const match = await this.matches.findById(input.matchId);
    if (!match) return;
    this.assertGameType(match.gameType, input.gameType);

    const updated = removePlayer(match, input.playerId);
    await this.matches.save(updated);

    this.events.publish({
      type: "player.left",
      matchId: input.matchId,
      gameType: updated.gameType,
      playerId: input.playerId,
      at: new Date(),
    });
  }

  private async getOrCreateMatch(
    matchId: MatchId,
    gameType: GameType,
  ): Promise<Match> {
    const existing = await this.matches.findById(matchId);
    if (!existing) {
      return createMatch(matchId, gameType);
    }

    this.assertGameType(existing.gameType, gameType);
    return existing;
  }

  private assertGameType(expected: GameType, actual: GameType): void {
    if (expected !== actual) {
      throw new Error("Game type mismatch");
    }
  }
}
