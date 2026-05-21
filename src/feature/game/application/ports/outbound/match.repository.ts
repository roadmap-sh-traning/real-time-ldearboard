import { Match, MatchId } from "../../../domain/match";

export interface MatchRepository {
  findById(id: MatchId): Promise<Match | undefined>;
  save(match: Match): Promise<void>;
}
