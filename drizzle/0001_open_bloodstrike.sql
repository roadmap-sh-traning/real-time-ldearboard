CREATE TABLE "player_scores" (
	"user_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "player_scores_user_id_pk" PRIMARY KEY("user_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_period_scores" (
	"period_type" text NOT NULL,
	"period_key" text NOT NULL,
	"user_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"match_id" text NOT NULL,
	"delta" integer NOT NULL,
	"score_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "player_scores" ADD CONSTRAINT "player_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_period_scores" ADD CONSTRAINT "leaderboard_period_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_tables" ADD CONSTRAINT "match_tables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_player_scores_score_desc" ON "player_scores" USING btree ("score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_leaderboard_period_scores_period_type_period_key_user_id" ON "leaderboard_period_scores" USING btree ("period_type","period_key","user_id");--> statement-breakpoint
CREATE INDEX "idx_match_tables_match_id_user_id" ON "match_tables" USING btree ("match_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_matches_status" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_matches_started_at" ON "matches" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_matches_ended_at" ON "matches" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX "idx_score_events_user_id_match_id_created_at" ON "score_events" USING btree ("user_id","created_at" DESC NULLS LAST);