import * as XLSX from "xlsx";
import { PenaltyKickPrizeStep } from "../../domain/penalty-kick-prize-sequence";

const OUTCOME_HEADERS = new Set(["outcome", "result", "win_loss", "win", "status"]);
const PRIZE_HEADERS = new Set([
  "prize",
  "prize_amount",
  "win_amount",
  "reward",
  "payout",
]);
const STAKE_HEADERS = new Set(["stake", "stake_amount", "loss_amount", "loss"]);
const STEP_HEADERS = new Set(["step", "kick", "round", "index", "order"]);

export function parsePenaltyKickPrizeSequenceFromExcel(
  fileBuffer: Buffer,
): PenaltyKickPrizeStep[] {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no worksheets");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  if (rows.length === 0) {
    throw new Error("Excel worksheet is empty");
  }

  const steps: PenaltyKickPrizeStep[] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeRow(row);
    if (isRowEmpty(normalized)) return;

    const step = parseStepRow(normalized, index);
    steps.push(step);
  });

  if (steps.length === 0) {
    throw new Error("Excel worksheet has no prize sequence rows");
  }

  return steps.map((step, index) => ({ ...step, stepIndex: index }));
}

function parseStepRow(
  row: Record<string, string>,
  fallbackIndex: number,
): PenaltyKickPrizeStep {
  const explicitOutcome = row.outcome;
  const prize = parseNonNegativeInteger(row.prize, "prize");
  const stake = parseNonNegativeInteger(row.stake, "stake");

  let won: boolean;
  if (explicitOutcome) {
    won = parseOutcome(explicitOutcome);
  } else if (prize > 0) {
    won = true;
  } else {
    won = false;
  }

  if (won) {
    if (prize <= 0) {
      throw new Error(
        `Row ${fallbackIndex + 2}: win steps require a positive prize amount`,
      );
    }

    return {
      stepIndex: fallbackIndex,
      won: true,
      prizeAmount: prize,
      stakeAmount: 0,
    };
  }

  if (stake <= 0) {
    throw new Error(
      `Row ${fallbackIndex + 2}: loss steps require a positive stake amount`,
    );
  }

  return {
    stepIndex: fallbackIndex,
    won: false,
    prizeAmount: 0,
    stakeAmount: stake,
  };
}

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    const header = normalizeHeader(String(key));
    if (!header) continue;
    normalized[header] = String(value ?? "").trim();
  }

  return normalized;
}

function normalizeHeader(header: string): string {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, "_");

  if (OUTCOME_HEADERS.has(normalized)) return "outcome";
  if (PRIZE_HEADERS.has(normalized)) return "prize";
  if (STAKE_HEADERS.has(normalized)) return "stake";
  if (STEP_HEADERS.has(normalized)) return "step";

  return normalized;
}

function parseOutcome(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (["win", "won", "goal", "success", "yes", "true", "1"].includes(normalized)) {
    return true;
  }

  if (["loss", "lost", "miss", "fail", "no", "false", "0"].includes(normalized)) {
    return false;
  }

  throw new Error(`Unsupported outcome value: ${value}`);
}

function parseNonNegativeInteger(value: string, field: string): number {
  if (!value) return 0;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }

  return parsed;
}

function isRowEmpty(row: Record<string, string>): boolean {
  return Object.values(row).every((value) => value.length === 0);
}
