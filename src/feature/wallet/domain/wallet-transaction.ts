import { GameType } from "../../game/domain/game-type";
import { PlayerId } from "../../game/domain/player";

export const walletTransactionTypes = [
  "credit",
  "main-to-game",
  "game-to-main",
] as const;

export type WalletTransactionType = (typeof walletTransactionTypes)[number];

export interface WalletTransactionRecord {
  userId: PlayerId;
  gameType?: GameType;
  sagaId?: string;
  type: WalletTransactionType;
  amount: number;
  reference: string;
  mainBalanceAfter: number;
  gameBalanceAfter?: number;
  createdAt?: Date;
}
