import { GameType } from "../../../../feature/game/domain/game-type";
import type { AppInstance } from "../../../../global";
import { WalletService } from "../../../../feature/wallet/application/services/wallet.service";
import { DrizzleWalletLedgerRepository } from "../../../../feature/wallet/infrastructure/outbound/drizzle-wallet-ledger.repository";
import { walletBalancesResponseSchema } from "../../../../schemas";

export default async function walletBalancesRoutes(fs: AppInstance) {
  const wallets = new WalletService(new DrizzleWalletLedgerRepository(fs.db));

  fs.get(
    "/",
    {
      preHandler: fs.authenticate,
      schema: {
        response: {
          200: walletBalancesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const gameType: GameType = "penalty-kicks";

      const balances = await wallets.getBalances({
        userId: request.user.sub,
        gameType,
      });

      return reply.send({
        userId: request.user.sub,
        gameType: balances.gameType,
        mainBalance: balances.mainBalance,
        gameBalance: balances.gameBalance,
      });
    },
  );
}
