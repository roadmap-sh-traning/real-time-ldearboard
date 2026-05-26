ALTER TABLE "matches" ADD COLUMN "game_type" text DEFAULT 'score' NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ADD COLUMN "game_type" text DEFAULT 'score' NOT NULL;