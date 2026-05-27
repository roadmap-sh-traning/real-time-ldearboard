import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  uniqueIndex,
  primaryKey,
  index
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    jti: text("jti").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [uniqueIndex("refresh_token_jti_idx").on(t.jti)],
);

export const PlayerScores = pgTable('player_scores', {
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  score: integer('score').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId] }),
  index('idx_player_scores_score_desc').on(t.score.desc()),
]);

export const scoreEvents = pgTable('score_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  matchId: text('match_id').notNull(),
  gameType: text('game_type').notNull().default('score'),
  delta: integer('delta').notNull(),
  scoreAfter: integer('score_after').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_score_events_user_id_match_id_created_at').on(t.userId, t.createdAt.desc())]);

export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  gameType: text('game_type').notNull().default('score'),
  status: text('status').notNull().default('pending'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_matches_status').on(t.status),
  index('idx_matches_started_at').on(t.startedAt),
  index('idx_matches_ended_at').on(t.endedAt),
]);

export const playerSessions = pgTable("player_sessions", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
});

export const matchTables = pgTable('match_tables', {
  id: serial('id').primaryKey(),
  matchId: text('match_id').notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
    joinedAt: timestamp('joined_at').defaultNow(),
    leftAt: timestamp('left_at'),
  },
  (t) => [index("idx_match_tables_match_id_user_id").on(t.matchId, t.userId)],
);

export const walletAccounts = pgTable("wallet_accounts", {
  userId: integer("user_id")
    .references(() => users.id)
    .primaryKey(),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameWalletAccounts = pgTable(
  "game_wallet_accounts",
  {
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    gameType: text("game_type").notNull(),
    balance: integer("balance").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.gameType] }),
    index("idx_game_wallet_accounts_game_type_user_id").on(t.gameType, t.userId),
  ],
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    gameType: text("game_type"),
    sagaId: text("saga_id"),
    type: text("type").notNull(),
    amount: integer("amount").notNull(),
    reference: text("reference").notNull(),
    mainBalanceAfter: integer("main_balance_after").notNull(),
    gameBalanceAfter: integer("game_balance_after"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_wallet_transactions_user_id_created_at").on(
      t.userId,
      t.createdAt.desc(),
    ),
    index("idx_wallet_transactions_saga_id").on(t.sagaId),
  ],
);

export const walletSagas = pgTable(
  "wallet_sagas",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    gameType: text("game_type").notNull(),
    amount: integer("amount").notNull(),
    reference: text("reference").notNull(),
    status: text("status").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    compensatedAt: timestamp("compensated_at"),
  },
  (t) => [index("idx_wallet_sagas_user_id_status").on(t.userId, t.status)],
);

export const gamePrizeSequences = pgTable(
  "game_prize_sequences",
  {
    id: text("id").primaryKey(),
    gameType: text("game_type").notNull(),
    isActive: integer("is_active").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_game_prize_sequences_game_type_active").on(t.gameType, t.isActive)],
);

export const gamePrizeSequenceSteps = pgTable(
  "game_prize_sequence_steps",
  {
    id: serial("id").primaryKey(),
    sequenceId: text("sequence_id")
      .references(() => gamePrizeSequences.id)
      .notNull(),
    stepIndex: integer("step_index").notNull(),
    won: integer("won").notNull(),
    prizeAmount: integer("prize_amount").notNull().default(0),
    stakeAmount: integer("stake_amount").notNull().default(0),
  },
  (t) => [
    index("idx_game_prize_sequence_steps_sequence_id").on(t.sequenceId, t.stepIndex),
  ],
);

export const penaltyKickProgress = pgTable(
  "penalty_kick_progress",
  {
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    matchId: text("match_id").notNull(),
    sequenceId: text("sequence_id")
      .references(() => gamePrizeSequences.id)
      .notNull(),
    nextStepIndex: integer("next_step_index").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.matchId] })],
);

export const leaderboardPeriodScores = pgTable('leaderboard_period_scores', {
  periodType: text('period_type').notNull(),
  periodKey: text('period_key').notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  score: integer('score').notNull().default(0),
}, (t) => [index('idx_leaderboard_period_scores_period_type_period_key_user_id').on(t.periodType, t.periodKey, t.userId)]);
