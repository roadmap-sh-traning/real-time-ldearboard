import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as schema from "../../../src/schema";

test("schema exposes wallet accounts, ledger, and saga tables", () => {
  assert.equal("walletAccounts" in schema, true);
  assert.equal("gameWalletAccounts" in schema, true);
  assert.equal("walletTransactions" in schema, true);
  assert.equal("walletSagas" in schema, true);
});
