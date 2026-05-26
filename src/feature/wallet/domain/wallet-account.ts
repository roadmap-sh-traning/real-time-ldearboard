import { GameType } from "../../game/domain/game-type";
import { PlayerId } from "../../game/domain/player";

export interface MainWalletAccount {
  userId: PlayerId;
  balance: number;
}

export interface GameWalletAccount {
  userId: PlayerId;
  gameType: GameType;
  balance: number;
}

export interface WalletBalanceSnapshot {
  userId: PlayerId;
  gameType: GameType;
  mainBalance: number;
  gameBalance: number;
}

export function createMainWalletAccount(userId: PlayerId): MainWalletAccount {
  return {
    userId,
    balance: 0,
  };
}

export function createGameWalletAccount(
  userId: PlayerId,
  gameType: GameType,
): GameWalletAccount {
  return {
    userId,
    gameType,
    balance: 0,
  };
}
