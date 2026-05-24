import { PlayerId } from "../../../domain/player";

export interface PlayerSessionPort {
  markConnected(playerId: PlayerId): Promise<void>;
  markDisconnected(playerId: PlayerId): Promise<void>;
  isConnected(playerId: PlayerId): Promise<boolean>;
}
