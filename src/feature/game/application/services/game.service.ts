import { GameCommandPort } from "../ports/inbound/game-command.port";
import { PlayerRepository } from "../ports/outbound/player.repository";
import { MatchRepository } from "../ports/outbound/match.repository";
import { EventPublisher } from "../ports/outbound/event-publisher.port";
import {
  addPlayer,
  createMatch,
  removePlayer,
  MatchId,
} from "../../domain/match";
import {
  applyScoreDelta,
  createPlayer,
  PlayerId,
} from "../../domain/player";

export class GameService implements GameCommandPort {
  constructor(
    private readonly players: PlayerRepository,
    private readonly matches: MatchRepository,
    private readonly events: EventPublisher,
  ) {}

  async joinMatch(input: {
    playerId: PlayerId;
    playerName: string;
    matchId: MatchId;
  }): Promise<void> {
    const player =
      (await this.players.findById(input.playerId)) ??
      createPlayer(input.playerId, input.playerName);
    await this.players.save(player);

    const match =
      (await this.matches.findById(input.matchId)) ??
      createMatch(input.matchId);
    const updated = addPlayer(match, input.playerId);
    await this.matches.save(updated);

    this.events.publish({
      type: "player.joined",
      matchId: input.matchId,
      playerId: input.playerId,
      playerName: player.name,
      at: new Date(),
    });
  }

  async submitScore(input: {
    playerId: PlayerId;
    matchId: MatchId;
    delta: number;
  }): Promise<void> {
    const match = await this.matches.findById(input.matchId);
    if (!match || !match.playerIds.has(input.playerId)) {
      throw new Error("Player not in match");
    }

    const player = await this.players.findById(input.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const updated = applyScoreDelta(player, input.delta);
    await this.players.save(updated);

    this.events.publish({
      type: "score.updated",
      matchId: input.matchId,
      playerId: input.playerId,
      newScore: updated.score,
      at: new Date(),
    });
  }

  async leaveMatch(input: {
    playerId: PlayerId;
    matchId: MatchId;
  }): Promise<void> {
    const match = await this.matches.findById(input.matchId);
    if (!match) return;

    const updated = removePlayer(match, input.playerId);
    await this.matches.save(updated);

    this.events.publish({
      type: "player.left",
      matchId: input.matchId,
      playerId: input.playerId,
      at: new Date(),
    });
  }
}
