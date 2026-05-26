import { test } from "node:test";
import * as assert from "node:assert/strict";
import { GameType } from "../../../src/feature/game/domain/game-type";

type WalletBalanceSnapshot = {
  userId: number;
  gameType: GameType;
  mainBalance: number;
  gameBalance: number;
};

type WalletTransactionRecord = {
  userId: number;
  gameType?: GameType;
  sagaId?: string;
  type: string;
  amount: number;
  reference: string;
  mainBalanceAfter: number;
  gameBalanceAfter?: number;
};

type WalletSagaRecord = {
  id: string;
  userId: number;
  gameType: GameType;
  amount: number;
  reference: string;
  status: string;
  failureReason?: string;
};

class InMemoryWalletLedgerRepository {
  private readonly mainBalances = new Map<number, number>();
  private readonly gameBalances = new Map<string, number>();
  private readonly transactions: WalletTransactionRecord[] = [];

  async ensureAccounts(input: {
    userId: number;
    gameType: GameType;
  }): Promise<WalletBalanceSnapshot> {
    if (!this.mainBalances.has(input.userId)) {
      this.mainBalances.set(input.userId, 0);
    }

    const gameKey = this.getGameKey(input.userId, input.gameType);
    if (!this.gameBalances.has(gameKey)) {
      this.gameBalances.set(gameKey, 0);
    }

    return {
      userId: input.userId,
      gameType: input.gameType,
      mainBalance: this.mainBalances.get(input.userId) ?? 0,
      gameBalance: this.gameBalances.get(gameKey) ?? 0,
    };
  }

  async creditMainWallet(input: {
    userId: number;
    amount: number;
    reference: string;
    sagaId?: string;
  }): Promise<void> {
    const nextBalance = (this.mainBalances.get(input.userId) ?? 0) + input.amount;
    this.mainBalances.set(input.userId, nextBalance);
    this.transactions.push({
      userId: input.userId,
      type: "credit",
      amount: input.amount,
      reference: input.reference,
      sagaId: input.sagaId,
      mainBalanceAfter: nextBalance,
    });
  }

  async transferFunds(input: {
    userId: number;
    gameType: GameType;
    amount: number;
    direction: "main-to-game" | "game-to-main";
    reference: string;
    sagaId?: string;
  }): Promise<void> {
    const snapshot = await this.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
    const nextMainBalance =
      input.direction === "main-to-game"
        ? snapshot.mainBalance - input.amount
        : snapshot.mainBalance + input.amount;
    const nextGameBalance =
      input.direction === "main-to-game"
        ? snapshot.gameBalance + input.amount
        : snapshot.gameBalance - input.amount;

    this.mainBalances.set(input.userId, nextMainBalance);
    this.gameBalances.set(
      this.getGameKey(input.userId, input.gameType),
      nextGameBalance,
    );
    this.transactions.push({
      userId: input.userId,
      gameType: input.gameType,
      sagaId: input.sagaId,
      type: input.direction,
      amount: input.amount,
      reference: input.reference,
      mainBalanceAfter: nextMainBalance,
      gameBalanceAfter: nextGameBalance,
    });
  }

  async listTransactionsByUser(userId: number): Promise<WalletTransactionRecord[]> {
    return this.transactions.filter((transaction) => transaction.userId === userId);
  }

  private getGameKey(userId: number, gameType: GameType): string {
    return `${userId}:${gameType}`;
  }
}

class InMemoryWalletSagaRepository {
  private readonly sagas = new Map<string, WalletSagaRecord>();

  async findById(id: string): Promise<WalletSagaRecord | undefined> {
    const saga = this.sagas.get(id);
    return saga ? { ...saga } : undefined;
  }

  async save(saga: WalletSagaRecord): Promise<void> {
    this.sagas.set(saga.id, { ...saga });
  }
}

async function loadWalletModules(): Promise<{
  WalletService: new (ledger: InMemoryWalletLedgerRepository) => {
    creditSharedWallet(input: {
      userId: number;
      amount: number;
      reference: string;
      sagaId?: string;
    }): Promise<void>;
    getBalances(input: {
      userId: number;
      gameType: GameType;
    }): Promise<WalletBalanceSnapshot>;
    transferToGameWallet(input: {
      userId: number;
      gameType: GameType;
      amount: number;
      reference: string;
      sagaId?: string;
    }): Promise<WalletBalanceSnapshot>;
    getTransactionHistory(input: {
      userId: number;
    }): Promise<WalletTransactionRecord[]>;
  };
  WalletGameStartSaga: new (
    wallets: InstanceType<
      new (ledger: InMemoryWalletLedgerRepository) => {
        creditSharedWallet(input: {
          userId: number;
          amount: number;
          reference: string;
          sagaId?: string;
        }): Promise<void>;
        getBalances(input: {
          userId: number;
          gameType: GameType;
        }): Promise<WalletBalanceSnapshot>;
        transferToGameWallet(input: {
          userId: number;
          gameType: GameType;
          amount: number;
          reference: string;
          sagaId?: string;
        }): Promise<WalletBalanceSnapshot>;
        getTransactionHistory(input: {
          userId: number;
        }): Promise<WalletTransactionRecord[]>;
      }
    >,
    sagas: InMemoryWalletSagaRepository,
  ) => {
    start<T>(input: {
      sagaId: string;
      userId: number;
      gameType: GameType;
      amount: number;
      reference: string;
      startGame: () => Promise<T>;
    }): Promise<T>;
  };
}> {
  const walletServicePath =
    "../../../src/feature/wallet/application/services/wallet.service";
  const walletSagaPath =
    "../../../src/feature/wallet/application/services/wallet-game-start.saga";
  let walletServiceModule: { WalletService: new (ledger: InMemoryWalletLedgerRepository) => unknown };
  try {
    walletServiceModule = require(walletServicePath);
  } catch {
    assert.fail("WalletService module is missing");
  }

  let walletSagaModule: {
    WalletGameStartSaga: new (
      wallets: unknown,
      sagas: InMemoryWalletSagaRepository,
    ) => unknown;
  };
  try {
    walletSagaModule = require(walletSagaPath);
  } catch {
    assert.fail("WalletGameStartSaga module is missing");
  }

  return {
    WalletService: walletServiceModule.WalletService as never,
    WalletGameStartSaga: walletSagaModule.WalletGameStartSaga as never,
  };
}

test("wallet service creates shared and per-game balances and records ledger history", async () => {
  const { WalletService } = await loadWalletModules();
  const ledger = new InMemoryWalletLedgerRepository();
  const wallets = new WalletService(ledger);

  await wallets.creditSharedWallet({
    userId: 7,
    amount: 100,
    reference: "signup-bonus",
  });

  const balances = await wallets.transferToGameWallet({
    userId: 7,
    gameType: "spin-wheel",
    amount: 25,
    reference: "spin-entry",
  });

  assert.deepEqual(balances, {
    userId: 7,
    gameType: "spin-wheel",
    mainBalance: 75,
    gameBalance: 25,
  });
  assert.deepEqual(
    (await wallets.getTransactionHistory({ userId: 7 })).map((transaction) => ({
      type: transaction.type,
      amount: transaction.amount,
      reference: transaction.reference,
      mainBalanceAfter: transaction.mainBalanceAfter,
      gameBalanceAfter: transaction.gameBalanceAfter,
      sagaId: transaction.sagaId,
    })),
    [
      {
        type: "credit",
        amount: 100,
        reference: "signup-bonus",
        mainBalanceAfter: 100,
        gameBalanceAfter: undefined,
        sagaId: undefined,
      },
      {
        type: "main-to-game",
        amount: 25,
        reference: "spin-entry",
        mainBalanceAfter: 75,
        gameBalanceAfter: 25,
        sagaId: undefined,
      },
    ],
  );
});

test("wallet start saga keeps reserved funds in the game wallet when initialization succeeds", async () => {
  const { WalletService, WalletGameStartSaga } = await loadWalletModules();
  const ledger = new InMemoryWalletLedgerRepository();
  const sagas = new InMemoryWalletSagaRepository();
  const wallets = new WalletService(ledger);
  const walletSaga = new WalletGameStartSaga(wallets, sagas);

  await wallets.creditSharedWallet({
    userId: 7,
    amount: 100,
    reference: "initial-funding",
  });

  const result = await walletSaga.start({
    sagaId: "saga-1",
    userId: 7,
    gameType: "penalty-kicks",
    amount: 40,
    reference: "penalty-round",
    startGame: async () => ({ roundId: "round-1" }),
  });

  assert.deepEqual(result, { roundId: "round-1" });
  assert.deepEqual(
    await wallets.getBalances({ userId: 7, gameType: "penalty-kicks" }),
    {
      userId: 7,
      gameType: "penalty-kicks",
      mainBalance: 60,
      gameBalance: 40,
    },
  );
  assert.equal((await sagas.findById("saga-1"))?.status, "completed");
});

test("wallet start saga compensates reserved funds when game initialization fails", async () => {
  const { WalletService, WalletGameStartSaga } = await loadWalletModules();
  const ledger = new InMemoryWalletLedgerRepository();
  const sagas = new InMemoryWalletSagaRepository();
  const wallets = new WalletService(ledger);
  const walletSaga = new WalletGameStartSaga(wallets, sagas);

  await wallets.creditSharedWallet({
    userId: 7,
    amount: 100,
    reference: "initial-funding",
  });

  await assert.rejects(
    () =>
      walletSaga.start({
        sagaId: "saga-2",
        userId: 7,
        gameType: "spin-wheel",
        amount: 30,
        reference: "spin-round",
        startGame: async () => {
          throw new Error("game init failed");
        },
      }),
    /game init failed/,
  );

  assert.deepEqual(await wallets.getBalances({ userId: 7, gameType: "spin-wheel" }), {
    userId: 7,
    gameType: "spin-wheel",
    mainBalance: 100,
    gameBalance: 0,
  });
  assert.deepEqual(
    (await wallets.getTransactionHistory({ userId: 7 })).map((transaction) => ({
      type: transaction.type,
      amount: transaction.amount,
      reference: transaction.reference,
      mainBalanceAfter: transaction.mainBalanceAfter,
      gameBalanceAfter: transaction.gameBalanceAfter,
      sagaId: transaction.sagaId,
    })),
    [
      {
        type: "credit",
        amount: 100,
        reference: "initial-funding",
        mainBalanceAfter: 100,
        gameBalanceAfter: undefined,
        sagaId: undefined,
      },
      {
        type: "main-to-game",
        amount: 30,
        reference: "spin-round:reserve",
        mainBalanceAfter: 70,
        gameBalanceAfter: 30,
        sagaId: "saga-2",
      },
      {
        type: "game-to-main",
        amount: 30,
        reference: "spin-round:compensate",
        mainBalanceAfter: 100,
        gameBalanceAfter: 0,
        sagaId: "saga-2",
      },
    ],
  );
  assert.equal((await sagas.findById("saga-2"))?.status, "compensated");
  assert.equal((await sagas.findById("saga-2"))?.failureReason, "game init failed");
});
