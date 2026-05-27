import { MatchId } from "../../../domain/match";
import { PlayerId } from "../../../domain/player";
import { GameType } from "../../../domain/game-type";

export interface GameCommandPort {
  joinMatch(input: {
    playerId: PlayerId;
    playerName: string;
    matchId: MatchId;
    gameType: GameType;
  }): Promise<void>;

  submitScore(input: {
    playerId: PlayerId;
    matchId: MatchId;
    gameType: GameType;
    delta: number;
  }): Promise<void>;

  submitPenaltyKick(input: {
    playerId: PlayerId;
    matchId: MatchId;
    gameType: "penalty-kicks";
    directionIndex: number;
    won: boolean;
    scoreWon: number;
    stakeAmount: number;
  }): Promise<void>;

  leaveMatch(input: {
    playerId: PlayerId;
    matchId: MatchId;
    gameType: GameType;
  }): Promise<void>;
}
