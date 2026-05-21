import { Match, MatchId } from "../../domain/match";
import { MatchRepository } from "../../application/ports/outbound/match.repository";

export class InMemoryMatchRepository implements MatchRepository {
  private readonly store = new Map<MatchId, Match>();

  async findById(id: MatchId): Promise<Match | undefined> {
    return this.store.get(id);
  }

  async save(match: Match): Promise<void> {
    this.store.set(match.id, match);
  }
}
