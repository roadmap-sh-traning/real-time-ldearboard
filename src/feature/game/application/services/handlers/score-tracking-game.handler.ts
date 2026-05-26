import { MatchRepository } from "../../ports/outbound/match.repository";
import { PlayerRepository } from "../../ports/outbound/player.repository";
import { ScoreEventRepository } from "../../ports/outbound/score-event.repository";
import { EventPublisher } from "../../ports/outbound/event-publisher.port";
import {
  GameHandler,
  JoinMatchCommand,
  LeaveMatchCommand,
  SubmitScoreCommand,
} from "../game-handler-registry";
import { GameType } from "../../../domain/game-type";
import {
  addPlayer,
  createMatch,
  Match,
  MatchId,
  removePlayer,
} from "../../../domain/match";
import { applyScoreDelta, createPlayer } from "../../../domain/player";

export class ScoreTrackingGameHandler implements GameHandler {
  constructor(
    public readonly gameType: GameType,
    private readonly players: PlayerRepository,
    private readonly matches: MatchRepository,
    private readonly scoreEvents: ScoreEventRepository,
    private readonly events: EventPublisher,
  ) {}

  async joinMatch(input: JoinMatchCommand): Promise<void> {
    this.assertGameType(input.gameType);

    const player =
      (await this.players.findById(input.playerId)) ??
      createPlayer(input.playerId, input.playerName);
    await this.players.save(player);

    const match = await this.getOrCreateMatch(input.matchId);
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

  async submitScore(input: SubmitScoreCommand): Promise<void> {
    this.assertGameType(input.gameType);

    const match = await this.matches.findById(input.matchId);
    if (!match || !match.playerIds.has(input.playerId)) {
      throw new Error("Player not in match");
    }
    this.assertPersistedGameType(match.gameType);

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

  async leaveMatch(input: LeaveMatchCommand): Promise<void> {
    this.assertGameType(input.gameType);

    const match = await this.matches.findById(input.matchId);
    if (!match) return;
    this.assertPersistedGameType(match.gameType);

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

  private async getOrCreateMatch(matchId: MatchId): Promise<Match> {
    const existing = await this.matches.findById(matchId);
    if (!existing) {
      return createMatch(matchId, this.gameType);
    }

    this.assertPersistedGameType(existing.gameType);
    return existing;
  }

  private assertGameType(actual: GameType): void {
    if (this.gameType !== actual) {
      throw new Error("Game type mismatch");
    }
  }

  private assertPersistedGameType(actual: GameType): void {
    if (this.gameType !== actual) {
      throw new Error("Game type mismatch");
    }
  }
}
