import { GameType } from "../../../../feature/game/domain/game-type";
import type { AppInstance } from "../../../../global";
import { WalletService } from "../../../../feature/wallet/application/services/wallet.service";
import { DrizzleWalletLedgerRepository } from "../../../../feature/wallet/infrastructure/outbound/drizzle-wallet-ledger.repository";
import {
  walletTransferBodySchema,
  walletTransferResponseSchema,
} from "../../../../schemas";

export default async function walletTransferRoutes(fs: AppInstance) {
  const wallets = new WalletService(new DrizzleWalletLedgerRepository(fs.db));

  fs.post(
    "/",
    {
      preHandler: fs.authenticate,
      schema: {
        body: walletTransferBodySchema,
        response: {
          200: walletTransferResponseSchema,
          400: { type: "object", properties: { message: { type: "string" } } },
          403: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { userId, amount, direction } = request.body;

      if (userId !== request.user.sub) {
        return reply.status(403).send({
          message: "You can only transfer funds for your own account",
        });
      }

      const gameType: GameType = request.body.gameType ?? "penalty-kicks";
      const reference =
        request.body.reference?.trim() ||
        (direction === "main-to-game"
          ? "client-transfer-to-game"
          : "client-transfer-to-main");

      try {
        const balances = await wallets.transferWallet({
          userId,
          gameType,
          amount,
          direction,
          reference,
        });

        return reply.send({
          userId,
          gameType: balances.gameType,
          amount,
          direction,
          mainBalance: balances.mainBalance,
          gameBalance: balances.gameBalance,
          reference,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to transfer funds";
        return reply.status(400).send({ message });
      }
    },
  );
}
