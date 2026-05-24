import { MatchId } from "./match";
import { PlayerId } from "./player";

export interface ScoreEventRecord {
  userId: PlayerId;
  matchId: MatchId;
  delta: number;
  scoreAfter: number;
}
