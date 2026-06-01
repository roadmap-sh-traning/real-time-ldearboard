import { eq } from "drizzle-orm";
import { AppInstance } from "../../../../global";
import { WalletService } from "../../../../feature/wallet/application/services/wallet.service";
import { DrizzleWalletLedgerRepository } from "../../../../feature/wallet/infrastructure/outbound/drizzle-wallet-ledger.repository";
import {
  walletCreditBodySchema,
  walletCreditResponseSchema,
} from "../../../../schemas/wallet-credit.schema";
import * as schema from "../../../../schema";

export default async function walletCreditRoutes(fs: AppInstance): Promise<void> {
  const wallets = new WalletService(new DrizzleWalletLedgerRepository(fs.db));

  fs.post(
    "/",
    {
      preHandler: fs.authenticate,
      schema: {
        body: walletCreditBodySchema,
        response: {
          200: walletCreditResponseSchema,
          400: { type: "object", properties: { message: { type: "string" } } },
          404: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { userId, amount, reference: referenceInput } = request.body;
      const reference = referenceInput?.trim() || "manual-credit";

      const [user] = await fs.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: "User not found" });
      }

      try {
        await wallets.creditSharedWallet({
          userId,
          amount,
          reference,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to credit wallet";
        return reply.status(400).send({ message });
      }

      const balances = await wallets.getBalances({
        userId,
        gameType: "penalty-kicks",
      });

      return reply.send({
        userId,
        amount,
        mainBalance: balances.mainBalance,
        reference,
      });
    },
  );
}
