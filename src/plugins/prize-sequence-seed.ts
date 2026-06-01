import fp from "fastify-plugin";
import { PenaltyKickPrizeSequenceService } from "../feature/game/application/services/penalty-kick-prize-sequence.service";
import { DrizzlePrizeSequenceRepository } from "../feature/game/infrastructure/outbound/drizzle-prize-sequence.repository";

export default fp(async (fastify) => {
  fastify.addHook("onReady", async () => {
    try {
      const prizeSequences = new PenaltyKickPrizeSequenceService(
        new DrizzlePrizeSequenceRepository(fastify.db),
      );
      const sequence = await prizeSequences.ensureDefaultActiveSequence();
      fastify.log.info(
        `Penalty-kicks prize sequence ready: ${sequence.id} (${sequence.steps.length} steps)`,
      );
    } catch (error) {
      fastify.log.error(
        { err: error },
        "Failed to seed default penalty-kicks prize sequence",
      );
    }
  });
});
