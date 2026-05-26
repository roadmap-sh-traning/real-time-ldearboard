import { GameType } from "../../../../feature/game/domain/game-type";
import { PlayerId } from "../../../../feature/game/domain/player";
import {
  compensateWalletSaga,
  completeWalletSaga,
  createWalletSagaRecord,
  markWalletSagaReserved,
} from "../../domain/wallet-saga";
import { WalletSagaRepository } from "../ports/outbound/wallet-saga.repository";
import { WalletService } from "./wallet.service";

export class WalletGameStartSaga {
  constructor(
    private readonly wallets: WalletService,
    private readonly sagas: WalletSagaRepository,
  ) {}

  async start<T>(input: {
    sagaId: string;
    userId: PlayerId;
    gameType: GameType;
    amount: number;
    reference: string;
    startGame: () => Promise<T>;
  }): Promise<T> {
    let saga =
      (await this.sagas.findById(input.sagaId)) ??
      createWalletSagaRecord({
        id: input.sagaId,
        userId: input.userId,
        gameType: input.gameType,
        amount: input.amount,
        reference: input.reference,
      });

    if (saga.status === "completed") {
      throw new Error(`Wallet saga ${input.sagaId} already completed`);
    }

    if (saga.status === "compensated") {
      throw new Error(`Wallet saga ${input.sagaId} already compensated`);
    }

    await this.sagas.save(saga);

    if (saga.status === "pending") {
      await this.wallets.transferToGameWallet({
        userId: input.userId,
        gameType: input.gameType,
        amount: input.amount,
        reference: `${input.reference}:reserve`,
        sagaId: input.sagaId,
      });
      saga = markWalletSagaReserved(saga);
      await this.sagas.save(saga);
    }

    try {
      const result = await input.startGame();
      saga = completeWalletSaga(saga);
      await this.sagas.save(saga);
      return result;
    } catch (error) {
      const failureReason = toFailureReason(error);

      if (saga.status === "reserved") {
        await this.wallets.transferToSharedWallet({
          userId: input.userId,
          gameType: input.gameType,
          amount: input.amount,
          reference: `${input.reference}:compensate`,
          sagaId: input.sagaId,
        });
        saga = compensateWalletSaga(saga, failureReason);
        await this.sagas.save(saga);
      }

      throw error;
    }
  }
}

function toFailureReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Wallet game start failed";
}
