import { GameType } from "../../../../feature/game/domain/game-type";
import { PlayerId } from "../../../../feature/game/domain/player";
import { WalletBalanceSnapshot } from "../../domain/wallet-account";
import { WalletTransactionRecord } from "../../domain/wallet-transaction";
import { WalletLedgerRepository } from "../ports/outbound/wallet-ledger.repository";

export class WalletService {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async getBalances(input: {
    userId: PlayerId;
    gameType: GameType;
  }): Promise<WalletBalanceSnapshot> {
    return this.ledger.ensureAccounts(input);
  }

  async creditSharedWallet(input: {
    userId: PlayerId;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<void> {
    this.assertPositiveIntegerAmount(input.amount);
    await this.ledger.creditMainWallet(input);
  }

  async transferToGameWallet(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<WalletBalanceSnapshot> {
    return this.transfer({
      ...input,
      direction: "main-to-game",
    });
  }

  async transferToSharedWallet(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<WalletBalanceSnapshot> {
    return this.transfer({
      ...input,
      direction: "game-to-main",
    });
  }

  async debitGameWallet(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<WalletBalanceSnapshot> {
    this.assertPositiveIntegerAmount(input.amount);

    const balances = await this.ledger.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });

    if (balances.gameBalance < input.amount) {
      throw new Error("Insufficient game wallet balance");
    }

    await this.ledger.debitGameWallet(input);
    return this.ledger.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
  }

  async getTransactionHistory(input: {
    userId: PlayerId;
  }): Promise<WalletTransactionRecord[]> {
    return this.ledger.listTransactionsByUser(input.userId);
  }

  private async transfer(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    direction: "main-to-game" | "game-to-main";
    reference: string;
    sagaId?: string;
  }): Promise<WalletBalanceSnapshot> {
    this.assertPositiveIntegerAmount(input.amount);

    const balances = await this.ledger.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });

    if (
      input.direction === "main-to-game" &&
      balances.mainBalance < input.amount
    ) {
      throw new Error("Insufficient main wallet balance");
    }

    if (
      input.direction === "game-to-main" &&
      balances.gameBalance < input.amount
    ) {
      throw new Error("Insufficient game wallet balance");
    }

    await this.ledger.transferFunds(input);
    return this.ledger.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
  }

  private assertPositiveIntegerAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("Wallet amount must be a positive integer");
    }
  }
}
