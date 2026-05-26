import { MatchId } from "./match";
import { PlayerId } from "./player";
import { GameType } from "./game-type";

export interface ScoreEventRecord {
  userId: PlayerId;
  matchId: MatchId;
  gameType: GameType;
  delta: number;
  scoreAfter: number;
}
