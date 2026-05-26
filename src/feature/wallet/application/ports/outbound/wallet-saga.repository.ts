import { WalletSagaRecord } from "../../../domain/wallet-saga";

export interface WalletSagaRepository {
  findById(id: string): Promise<WalletSagaRecord | undefined>;
  save(saga: WalletSagaRecord): Promise<void>;
}
