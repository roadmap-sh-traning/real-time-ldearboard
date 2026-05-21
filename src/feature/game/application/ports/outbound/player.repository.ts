import { Player, PlayerId } from "../../../domain/player";

export interface PlayerRepository {
  findById(id: PlayerId): Promise<Player | undefined>;
  save(player: Player): Promise<void>;
}
