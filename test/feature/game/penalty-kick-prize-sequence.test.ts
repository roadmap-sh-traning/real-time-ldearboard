import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parsePenaltyKickPrizeSequenceFromExcel } from "../../../src/feature/game/infrastructure/outbound/excel-prize-sequence.parser";
import { PenaltyKickPrizeSequenceService } from "../../../src/feature/game/application/services/penalty-kick-prize-sequence.service";
import { PrizeSequenceRepository } from "../../../src/feature/game/application/ports/outbound/prize-sequence.repository";
import {
  PenaltyKickPrizeSequence,
  PenaltyKickProgress,
} from "../../../src/feature/game/domain/penalty-kick-prize-sequence";

function buildWorkbookBuffer(rows: Record<string, string | number>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Prizes");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

class InMemoryPrizeSequenceRepository implements PrizeSequenceRepository {
  private activeSequence?: PenaltyKickPrizeSequence;
  private readonly progress = new Map<string, PenaltyKickProgress>();

  async getActiveSequence() {
    return this.activeSequence;
  }

  async replaceActiveSequence(sequence: PenaltyKickPrizeSequence): Promise<void> {
    this.activeSequence = sequence;
  }

  async getProgress(input: { userId: number; matchId: string }) {
    return this.progress.get(`${input.userId}:${input.matchId}`);
  }

  async resetProgress(progress: PenaltyKickProgress): Promise<void> {
    this.progress.set(`${progress.userId}:${progress.matchId}`, { ...progress });
  }

  async advanceProgress(input: { userId: number; matchId: string }) {
    const key = `${input.userId}:${input.matchId}`;
    const existing = this.progress.get(key);
    if (!existing) {
      throw new Error("Penalty kick progress not found");
    }

    const updated = {
      ...existing,
      nextStepIndex: existing.nextStepIndex + 1,
    };
    this.progress.set(key, updated);
    return updated;
  }
}

test("excel parser reads win and loss rows from prize sequence sheet", () => {
  const buffer = buildWorkbookBuffer([
    { outcome: "win", prize: 15, stake: 0 },
    { outcome: "loss", prize: 0, stake: 10 },
    { outcome: "win", prize: 25, stake: 0 },
  ]);

  const steps = parsePenaltyKickPrizeSequenceFromExcel(buffer);

  assert.deepEqual(steps, [
    { stepIndex: 0, won: true, prizeAmount: 15, stakeAmount: 0 },
    { stepIndex: 1, won: false, prizeAmount: 0, stakeAmount: 10 },
    { stepIndex: 2, won: true, prizeAmount: 25, stakeAmount: 0 },
  ]);
});

test("prize sequence service activates uploaded excel and serves steps in order", async () => {
  const repository = new InMemoryPrizeSequenceRepository();
  const service = new PenaltyKickPrizeSequenceService(repository);
  const buffer = buildWorkbookBuffer([
    { outcome: "win", prize: 12, stake: 0 },
    { outcome: "loss", prize: 0, stake: 5 },
  ]);

  await service.uploadFromExcel({ fileBuffer: buffer });
  await service.initializeMatchProgress({ userId: 7, matchId: "match-1" });

  const firstKick = await service.getStepForKick({ userId: 7, matchId: "match-1" });
  assert.equal(firstKick.step.prizeAmount, 12);
  assert.equal(firstKick.step.won, true);

  await service.advanceAfterKick({ userId: 7, matchId: "match-1" });

  const secondKick = await service.getStepForKick({ userId: 7, matchId: "match-1" });
  assert.equal(secondKick.step.stakeAmount, 5);
  assert.equal(secondKick.step.won, false);
});
