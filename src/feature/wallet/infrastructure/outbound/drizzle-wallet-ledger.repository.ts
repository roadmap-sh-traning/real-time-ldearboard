import { and, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { GameType } from "../../../game/domain/game-type";
import { PlayerId } from "../../../game/domain/player";
import { WalletLedgerRepository } from "../../application/ports/outbound/wallet-ledger.repository";
import { WalletBalanceSnapshot } from "../../domain/wallet-account";
import { WalletTransactionRecord } from "../../domain/wallet-transaction";

export class DrizzleWalletLedgerRepository implements WalletLedgerRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async ensureAccounts(input: {
    userId: PlayerId;
    gameType: GameType;
  }): Promise<WalletBalanceSnapshot> {
    return this.db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .insert(schema.walletAccounts)
        .values({
          userId: input.userId,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.gameWalletAccounts)
        .values({
          userId: input.userId,
          gameType: input.gameType,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      const [mainWallet] = await tx
        .select({ balance: schema.walletAccounts.balance })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, input.userId))
        .limit(1);

      const [gameWallet] = await tx
        .select({ balance: schema.gameWalletAccounts.balance })
        .from(schema.gameWalletAccounts)
        .where(
          and(
            eq(schema.gameWalletAccounts.userId, input.userId),
            eq(schema.gameWalletAccounts.gameType, input.gameType),
          ),
        )
        .limit(1);

      return {
        userId: input.userId,
        gameType: input.gameType,
        mainBalance: mainWallet?.balance ?? 0,
        gameBalance: gameWallet?.balance ?? 0,
      };
    });
  }

  async creditMainWallet(input: {
    userId: PlayerId;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .insert(schema.walletAccounts)
        .values({
          userId: input.userId,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      const [mainWallet] = await tx
        .select({ balance: schema.walletAccounts.balance })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, input.userId))
        .limit(1);

      const nextMainBalance = (mainWallet?.balance ?? 0) + input.amount;

      await tx
        .update(schema.walletAccounts)
        .set({
          balance: nextMainBalance,
          updatedAt: now,
        })
        .where(eq(schema.walletAccounts.userId, input.userId));

      await tx.insert(schema.walletTransactions).values({
        userId: input.userId,
        gameType: null,
        sagaId: input.sagaId ?? null,
        type: "credit",
        amount: input.amount,
        reference: input.reference,
        mainBalanceAfter: nextMainBalance,
        gameBalanceAfter: null,
        createdAt: now,
      });
    });
  }

  async transferFunds(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    direction: "main-to-game" | "game-to-main";
    reference: string;
    sagaId?: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .insert(schema.walletAccounts)
        .values({
          userId: input.userId,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.gameWalletAccounts)
        .values({
          userId: input.userId,
          gameType: input.gameType,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      const [mainWallet] = await tx
        .select({ balance: schema.walletAccounts.balance })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, input.userId))
        .limit(1);

      const [gameWallet] = await tx
        .select({ balance: schema.gameWalletAccounts.balance })
        .from(schema.gameWalletAccounts)
        .where(
          and(
            eq(schema.gameWalletAccounts.userId, input.userId),
            eq(schema.gameWalletAccounts.gameType, input.gameType),
          ),
        )
        .limit(1);

      const currentMainBalance = mainWallet?.balance ?? 0;
      const currentGameBalance = gameWallet?.balance ?? 0;
      const nextMainBalance =
        input.direction === "main-to-game"
          ? currentMainBalance - input.amount
          : currentMainBalance + input.amount;
      const nextGameBalance =
        input.direction === "main-to-game"
          ? currentGameBalance + input.amount
          : currentGameBalance - input.amount;

      await tx
        .update(schema.walletAccounts)
        .set({
          balance: nextMainBalance,
          updatedAt: now,
        })
        .where(eq(schema.walletAccounts.userId, input.userId));

      await tx
        .update(schema.gameWalletAccounts)
        .set({
          balance: nextGameBalance,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.gameWalletAccounts.userId, input.userId),
            eq(schema.gameWalletAccounts.gameType, input.gameType),
          ),
        );

      await tx.insert(schema.walletTransactions).values({
        userId: input.userId,
        gameType: input.gameType,
        sagaId: input.sagaId ?? null,
        type: input.direction,
        amount: input.amount,
        reference: input.reference,
        mainBalanceAfter: nextMainBalance,
        gameBalanceAfter: nextGameBalance,
        createdAt: now,
      });
    });
  }

  async debitGameWallet(input: {
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .insert(schema.gameWalletAccounts)
        .values({
          userId: input.userId,
          gameType: input.gameType,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      const [mainWallet] = await tx
        .select({ balance: schema.walletAccounts.balance })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, input.userId))
        .limit(1);

      const [gameWallet] = await tx
        .select({ balance: schema.gameWalletAccounts.balance })
        .from(schema.gameWalletAccounts)
        .where(
          and(
            eq(schema.gameWalletAccounts.userId, input.userId),
            eq(schema.gameWalletAccounts.gameType, input.gameType),
          ),
        )
        .limit(1);

      const mainBalance = mainWallet?.balance ?? 0;
      const currentGameBalance = gameWallet?.balance ?? 0;
      const nextGameBalance = currentGameBalance - input.amount;

      await tx
        .update(schema.gameWalletAccounts)
        .set({
          balance: nextGameBalance,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.gameWalletAccounts.userId, input.userId),
            eq(schema.gameWalletAccounts.gameType, input.gameType),
          ),
        );

      await tx.insert(schema.walletTransactions).values({
        userId: input.userId,
        gameType: input.gameType,
        sagaId: input.sagaId ?? null,
        type: "game-debit",
        amount: input.amount,
        reference: input.reference,
        mainBalanceAfter: mainBalance,
        gameBalanceAfter: nextGameBalance,
        createdAt: now,
      });
    });
  }

  async listTransactionsByUser(
    userId: PlayerId,
  ): Promise<WalletTransactionRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.userId, userId))
      .orderBy(schema.walletTransactions.id);

    return rows.map((row) => ({
      userId: row.userId,
      gameType: (row.gameType ?? undefined) as GameType | undefined,
      sagaId: row.sagaId ?? undefined,
      type: row.type as WalletTransactionRecord["type"],
      amount: row.amount,
      reference: row.reference,
      mainBalanceAfter: row.mainBalanceAfter,
      gameBalanceAfter: row.gameBalanceAfter ?? undefined,
      createdAt: row.createdAt ?? undefined,
    }));
  }
}
