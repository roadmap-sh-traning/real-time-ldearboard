import { LeaderboardSnapshot } from "../../domain/leaderboard-snapshot";
import { CurrentUser } from "../../domain/leaderboard-entry";
import { EventPublisher } from "../../../game/application/ports/outbound/event-publisher.port";
import { LeaderboardBroadcasterPort } from "../ports/outbound/leaderboard-broadcaster.port";
import { NameResolverPort } from "../ports/outbound/name-resolver.port";
import { ScoreStorePort } from "../ports/outbound/score-store.port";

const FLUSH_DEBOUNCE_MS = 250;

export class LeaderboardService {
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingScores = new Map<string, number>();

  constructor(
    private readonly scoreStore: ScoreStorePort,
    private readonly nameResolver: NameResolverPort,
    private readonly leaderboardBroadcaster: LeaderboardBroadcasterPort,
    private readonly eventPublisher: EventPublisher,
  ) {
    this.eventPublisher.subscribe((event) => {
      if (event.type !== "score.updated") return;
      this.onScoreUpdated(event.playerId, event.newScore);
    });
  }

  async getLeaderboard(): Promise<LeaderboardSnapshot> {
    const entries = await this.scoreStore.getLeaderboard();
    const userIds = entries.map((entry) => Number(entry.playerId));
    const names = await this.nameResolver.resolveMany(userIds);

    const formattedEntries = entries.map((entry) => ({
      rank: entry.rank,
      playerId: entry.playerId,
      name: names.get(Number(entry.playerId)) ?? "Unknown",
      score: entry.score,
    }));
    return {
      entries: formattedEntries,
      updatedAt: new Date().toISOString(),
    };
  }

  async getCurrentUser(playerId: string): Promise<CurrentUser> {
    const rank = await this.scoreStore.currentUser(playerId);
    return {
      rank: rank.rank,
      score: rank.score,
    };
  }

  private onScoreUpdated(playerId: number, score: number): void {
    this.pendingScores.set(String(playerId), score);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, FLUSH_DEBOUNCE_MS);
  }

  private async flush(): Promise<void> {
    await this.applyPendingScores();
    await this.leaderboardBroadcaster.push(await this.getLeaderboard());
  }

  private async applyPendingScores(): Promise<void> {
    if (this.pendingScores.size === 0) return;

    const updates = [...this.pendingScores.entries()];
    this.pendingScores.clear();

    await Promise.all(
      updates.map(([playerId, score]) =>
        this.scoreStore.saveScore(playerId, score),
      ),
    );
  }
}
