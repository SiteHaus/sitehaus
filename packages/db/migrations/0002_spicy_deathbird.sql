ALTER TYPE "public"."otp_purpose" ADD VALUE 'email_change';--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'deleted';--> statement-breakpoint
CREATE TABLE "totp_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"secret_encrypted" text NOT NULL,
	"backup_codes_hashed" jsonb NOT NULL,
	"enabled_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "totp_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "totp_credentials" ADD CONSTRAINT "totp_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;