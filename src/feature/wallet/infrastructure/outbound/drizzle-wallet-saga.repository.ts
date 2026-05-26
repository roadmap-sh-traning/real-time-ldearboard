import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { WalletSagaRepository } from "../../application/ports/outbound/wallet-saga.repository";
import { WalletSagaRecord } from "../../domain/wallet-saga";

export class DrizzleWalletSagaRepository implements WalletSagaRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: string): Promise<WalletSagaRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.walletSagas)
      .where(eq(schema.walletSagas.id, id))
      .limit(1);

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      userId: row.userId,
      gameType: row.gameType as WalletSagaRecord["gameType"],
      amount: row.amount,
      reference: row.reference,
      status: row.status as WalletSagaRecord["status"],
      failureReason: row.failureReason ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
      compensatedAt: row.compensatedAt ?? undefined,
    };
  }

  async save(saga: WalletSagaRecord): Promise<void> {
    await this.db
      .insert(schema.walletSagas)
      .values({
        id: saga.id,
        userId: saga.userId,
        gameType: saga.gameType,
        amount: saga.amount,
        reference: saga.reference,
        status: saga.status,
        failureReason: saga.failureReason ?? null,
        createdAt: saga.createdAt,
        updatedAt: saga.updatedAt,
        completedAt: saga.completedAt ?? null,
        compensatedAt: saga.compensatedAt ?? null,
      })
      .onConflictDoUpdate({
        target: schema.walletSagas.id,
        set: {
          userId: saga.userId,
          gameType: saga.gameType,
          amount: saga.amount,
          reference: saga.reference,
          status: saga.status,
          failureReason: saga.failureReason ?? null,
          updatedAt: saga.updatedAt,
          completedAt: saga.completedAt ?? null,
          compensatedAt: saga.compensatedAt ?? null,
        },
      });
  }
}
