CREATE TABLE "game_prize_sequence_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"sequence_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"won" integer NOT NULL,
	"prize_amount" integer DEFAULT 0 NOT NULL,
	"stake_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_prize_sequences" (
	"id" text PRIMARY KEY NOT NULL,
	"game_type" text NOT NULL,
	"is_active" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_wallet_accounts" (
	"user_id" integer NOT NULL,
	"game_type" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_wallet_accounts_user_id_game_type_pk" PRIMARY KEY("user_id","game_type")
);
--> statement-breakpoint
CREATE TABLE "penalty_kick_progress" (
	"user_id" integer NOT NULL,
	"match_id" text NOT NULL,
	"sequence_id" text NOT NULL,
	"next_step_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "penalty_kick_progress_user_id_match_id_pk" PRIMARY KEY("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_sagas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_type" text NOT NULL,
	"amount" integer NOT NULL,
	"reference" text NOT NULL,
	"status" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"compensated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_type" text,
	"saga_id" text,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"reference" text NOT NULL,
	"main_balance_after" integer NOT NULL,
	"game_balance_after" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_prize_sequence_steps" ADD CONSTRAINT "game_prize_sequence_steps_sequence_id_game_prize_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."game_prize_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_wallet_accounts" ADD CONSTRAINT "game_wallet_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_kick_progress" ADD CONSTRAINT "penalty_kick_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_kick_progress" ADD CONSTRAINT "penalty_kick_progress_sequence_id_game_prize_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."game_prize_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_sagas" ADD CONSTRAINT "wallet_sagas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_prize_sequence_steps_sequence_id" ON "game_prize_sequence_steps" USING btree ("sequence_id","step_index");--> statement-breakpoint
CREATE INDEX "idx_game_prize_sequences_game_type_active" ON "game_prize_sequences" USING btree ("game_type","is_active");--> statement-breakpoint
CREATE INDEX "idx_game_wallet_accounts_game_type_user_id" ON "game_wallet_accounts" USING btree ("game_type","user_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_sagas_user_id_status" ON "wallet_sagas" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_user_id_created_at" ON "wallet_transactions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_saga_id" ON "wallet_transactions" USING btree ("saga_id");