import multipart from "@fastify/multipart";
import { AppInstance } from "../../../../global";
import { PenaltyKickPrizeSequenceService } from "../../../../feature/game/application/services/penalty-kick-prize-sequence.service";
import { DrizzlePrizeSequenceRepository } from "../../../../feature/game/infrastructure/outbound/drizzle-prize-sequence.repository";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default async function penaltyKickPrizeSequenceRoutes(
  fs: AppInstance,
): Promise<void> {
  await fs.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });

  const prizeSequences = new PenaltyKickPrizeSequenceService(
    new DrizzlePrizeSequenceRepository(fs.db),
  );

  fs.post("/", { preHandler: fs.authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ message: "Excel file is required" });
    }

    const filename = file.filename.toLowerCase();
    if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
      return reply.status(400).send({
        message: "Only .xlsx or .xls files are supported",
      });
    }

    const fileBuffer = await file.toBuffer();
    if (fileBuffer.byteLength === 0) {
      return reply.status(400).send({ message: "Uploaded file is empty" });
    }

    try {
      const sequence = await prizeSequences.uploadFromExcel({ fileBuffer });
      return reply.status(201).send({
        sequenceId: sequence.id,
        gameType: sequence.gameType,
        stepCount: sequence.steps.length,
        steps: sequence.steps.map((step) => ({
          stepIndex: step.stepIndex,
          won: step.won,
          prizeAmount: step.prizeAmount,
          stakeAmount: step.stakeAmount,
        })),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to import prize sequence";
      return reply.status(400).send({ message });
    }
  });

  fs.get("/", { preHandler: fs.authenticate }, async (_request, reply) => {
    const sequence = await prizeSequences.getActiveSequence("penalty-kicks");
    if (!sequence) {
      return reply.status(404).send({
        message: "No active prize sequence configured for penalty-kicks",
      });
    }

    return reply.send({
      sequenceId: sequence.id,
      gameType: sequence.gameType,
      stepCount: sequence.steps.length,
      steps: sequence.steps.map((step) => ({
        stepIndex: step.stepIndex,
        won: step.won,
        prizeAmount: step.prizeAmount,
        stakeAmount: step.stakeAmount,
      })),
    });
  });
}
