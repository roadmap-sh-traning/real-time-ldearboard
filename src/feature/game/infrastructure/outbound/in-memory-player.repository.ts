import { Player, PlayerId } from "../../domain/player";
import { PlayerRepository } from "../../application/ports/outbound/player.repository";

export class InMemoryPlayerRepository implements PlayerRepository {
  private readonly store = new Map<PlayerId, Player>();

  async findById(id: PlayerId): Promise<Player | undefined> {
    return this.store.get(id);
  }

  async save(player: Player): Promise<void> {
    this.store.set(player.id, player);
  }
}
