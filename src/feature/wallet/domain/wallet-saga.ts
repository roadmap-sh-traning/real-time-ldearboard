import { GameType } from "../../game/domain/game-type";
import { PlayerId } from "../../game/domain/player";

export const walletSagaStatuses = [
  "pending",
  "reserved",
  "completed",
  "compensated",
] as const;

export type WalletSagaStatus = (typeof walletSagaStatuses)[number];

export interface WalletSagaRecord {
  id: string;
  userId: PlayerId;
  gameType: GameType;
  amount: number;
  reference: string;
  status: WalletSagaStatus;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  compensatedAt?: Date;
}

export function createWalletSagaRecord(input: {
  id: string;
  userId: PlayerId;
  gameType: GameType;
  amount: number;
  reference: string;
  now?: Date;
}): WalletSagaRecord {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    userId: input.userId,
    gameType: input.gameType,
    amount: input.amount,
    reference: input.reference,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export function markWalletSagaReserved(
  saga: WalletSagaRecord,
  now: Date = new Date(),
): WalletSagaRecord {
  if (saga.status !== "pending") {
    throw new Error("Wallet saga can only reserve funds from pending state");
  }

  return {
    ...saga,
    status: "reserved",
    updatedAt: now,
  };
}

export function completeWalletSaga(
  saga: WalletSagaRecord,
  now: Date = new Date(),
): WalletSagaRecord {
  if (saga.status !== "reserved") {
    throw new Error("Wallet saga can only complete from reserved state");
  }

  return {
    ...saga,
    status: "completed",
    updatedAt: now,
    completedAt: now,
  };
}

export function compensateWalletSaga(
  saga: WalletSagaRecord,
  failureReason: string,
  now: Date = new Date(),
): WalletSagaRecord {
  if (saga.status !== "reserved") {
    throw new Error("Wallet saga can only compensate from reserved state");
  }

  return {
    ...saga,
    status: "compensated",
    failureReason,
    updatedAt: now,
    compensatedAt: now,
  };
}
