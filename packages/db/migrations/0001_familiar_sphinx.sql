ALTER TYPE "public"."otp_purpose" ADD VALUE 'login';--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"scope" varchar(512) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "scope" varchar(512);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "allowed_scopes" text DEFAULT 'openid profile email';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "requires_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_code_hash_idx" ON "invites" USING btree ("code_hash");