import { ScoreEventRecord } from "../../../domain/score-event";

export interface ScoreEventRepository {
  append(event: ScoreEventRecord): Promise<void>;
}
