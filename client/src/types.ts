export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: number | string;
  name: string;
  score: number;
}

export interface LeaderboardSnapshot {
  type: "snapshot";
  entries: LeaderboardEntry[];
  updatedAt: string;
}

export interface PenaltyKickResult {
  type: "penalty-kick.result";
  matchId: string;
  gameType: "penalty-kicks";
  playerId: number;
  directionIndex: number;
  won: boolean;
  amount: number;
  sequenceId: string;
  sequenceStepIndex: number;
  remainingSteps: number;
  mainBalance: number;
  gameBalance: number;
  at: string;
}

export interface PlayerJoinedEvent {
  type: "player.joined";
  matchId: string;
  gameType: string;
  playerId: number;
  sequenceId?: string;
  totalSteps?: number;
}

export interface GameConnectedEvent {
  type: "connected";
  playerId: number;
}

export type GameServerEvent =
  | PenaltyKickResult
  | PlayerJoinedEvent
  | GameConnectedEvent
  | { type: "score.updated"; newScore: number }
  | { type: "WS_ERROR"; code: string; message?: string };

export interface WalletCreditResponse {
  userId: number;
  amount: number;
  mainBalance: number;
  reference: string;
}

export interface PrizeSequenceInfo {
  sequenceId: string;
  gameType: string;
  stepCount: number;
  isActive?: boolean;
  steps?: Array<{
    stepIndex: number;
    won: boolean;
    prizeAmount: number;
    stakeAmount: number;
  }>;
}

export interface UploadSequenceResponse extends PrizeSequenceInfo {
  steps: Array<{
    stepIndex: number;
    won: boolean;
    prizeAmount: number;
    stakeAmount: number;
  }>;
}
