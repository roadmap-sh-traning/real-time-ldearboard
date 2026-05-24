CREATE TABLE "player_sessions" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"disconnected_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;