import multipart from "@fastify/multipart";
import { Type } from "@sinclair/typebox";
import { AppInstance } from "../../../../global";
import { PenaltyKickPrizeSequenceService } from "../../../../feature/game/application/services/penalty-kick-prize-sequence.service";
import { DrizzlePrizeSequenceRepository } from "../../../../feature/game/infrastructure/outbound/drizzle-prize-sequence.repository";
import {
  activateSequenceBodySchema,
  generateSequenceBodySchema,
  prizeSequenceResponseSchema,
} from "../../../../schemas";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function toSequenceResponse(
  sequence: {
    id: string;
    gameType: string;
    steps: Array<{
      stepIndex: number;
      won: boolean;
      prizeAmount: number;
      stakeAmount: number;
    }>;
  },
  isActive: boolean,
) {
  return {
    sequenceId: sequence.id,
    gameType: sequence.gameType,
    stepCount: sequence.steps.length,
    isActive,
    steps: sequence.steps.map((step) => ({
      stepIndex: step.stepIndex,
      won: step.won,
      prizeAmount: step.prizeAmount,
      stakeAmount: step.stakeAmount,
    })),
  };
}

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

    const activate =
      (request.query as { activate?: string }).activate !== "false";

    try {
      const sequence = await prizeSequences.uploadFromExcel({
        fileBuffer,
        activate,
      });
      return reply.status(201).send({
        sequenceId: sequence.id,
        gameType: sequence.gameType,
        stepCount: sequence.steps.length,
        isActive: activate,
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

  fs.get("/", { preHandler: fs.authenticate }, async (request, reply) => {
    const sequenceId = (request.query as { sequenceId?: string }).sequenceId?.trim();
    const sequence = sequenceId
      ? await prizeSequences.getSequenceById(sequenceId)
      : await prizeSequences.getActiveSequence("penalty-kicks");

    if (!sequence) {
      return reply.status(404).send({
        message: sequenceId
          ? `Prize sequence ${sequenceId} not found`
          : "No active prize sequence. The server creates a default on startup.",
      });
    }

    const active = await prizeSequences.getActiveSequence("penalty-kicks");

    return reply.send(
      toSequenceResponse(sequence, active?.id === sequence.id),
    );
  });

  fs.post(
    "/generate",
    {
      preHandler: fs.authenticate,
      schema: {
        body: Type.Optional(generateSequenceBodySchema),
        response: {
          201: prizeSequenceResponseSchema,
          400: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { stepCount, activate } = request.body ?? {};

      try {
        const shouldActivate = activate ?? true;
        const sequence = await prizeSequences.generateSequence({
          stepCount,
          activate: shouldActivate,
        });
        const active = await prizeSequences.getActiveSequence("penalty-kicks");
        return reply.status(201).send(
          toSequenceResponse(sequence, active?.id === sequence.id),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate sequence";
        return reply.status(400).send({ message });
      }
    },
  );

  fs.put(
    "/active",
    {
      preHandler: fs.authenticate,
      schema: {
        body: activateSequenceBodySchema,
        response: {
          200: prizeSequenceResponseSchema,
          400: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const sequence = await prizeSequences.activateSequence(
          request.body.sequenceId,
        );
        return reply.send(toSequenceResponse(sequence, true));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to activate sequence";
        return reply.status(400).send({ message });
      }
    },
  );
}
