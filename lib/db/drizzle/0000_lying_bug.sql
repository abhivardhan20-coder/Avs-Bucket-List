CREATE TABLE "token_blacklist" (
	"token" text PRIMARY KEY NOT NULL,
	"revoked_at" timestamp DEFAULT now() NOT NULL
);
