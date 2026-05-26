import { GameType } from "../../../../game/domain/game-type";
import { PlayerId } from "../../../../game/domain/player";
import { WalletBalanceSnapshot } from "../../../domain/wallet-account";
import { WalletTransactionRecord } from "../../../domain/wallet-transaction";

export interface WalletLedgerRepository {
  ensureAccounts(input: {
    userId: PlayerId;
    gameType: GameType;
  }): Promise<WalletBalanceSnapshot>;
  creditMainWallet(input: {
    userId: PlayerId;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<void>;
  transferFunds(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    direction: "main-to-game" | "game-to-main";
    reference: string;
    sagaId?: string;
  }): Promise<void>;
  listTransactionsByUser(userId: PlayerId): Promise<WalletTransactionRecord[]>;
}
