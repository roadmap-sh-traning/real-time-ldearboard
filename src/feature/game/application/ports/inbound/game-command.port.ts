import { MatchId } from "../../../domain/match";
import { PlayerId } from "../../../domain/player";

export interface GameCommandPort {
  joinMatch(input: {
    playerId: PlayerId;
    playerName: string;
    matchId: MatchId;
  }): Promise<void>;

  submitScore(input: {
    playerId: PlayerId;
    matchId: MatchId;
    delta: number;
  }): Promise<void>;

  leaveMatch(input: {
    playerId: PlayerId;
    matchId: MatchId;
  }): Promise<void>;
}
