CREATE TYPE "public"."code_challenge_method" AS ENUM('S256');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('public', 'confidential');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('email_verification', 'password_reset', 'invite');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."project_billing_status" AS ENUM('paid', 'outstanding', 'pending', 'late');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'paused', 'submitted', 'reviewing', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('ecommerce', 'saas', 'portfolio', 'marketing', 'landing_page', 'blog', 'internal_tool', 'web_app', 'rebuild', 'maintenance', 'other');--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"user_id" uuid,
	"client_id" uuid,
	"redirect_uri" varchar(512) NOT NULL,
	"code_challenge" varchar(128) NOT NULL,
	"code_challenge_method" "code_challenge_method" DEFAULT 'S256' NOT NULL,
	"session_id" uuid,
	"expires_at" timestamp with time zone DEFAULT now() + interval '90 seconds' NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_redirect_uris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"uri" varchar(512) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "client_type" DEFAULT 'public' NOT NULL,
	"first_party" boolean DEFAULT true NOT NULL,
	"audience" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(120),
	"platform" varchar(50),
	"browser" varchar(50),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_ip_hash" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"email" varchar(256) NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '15 minutes' NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"version" varchar(32) DEFAULT 'argon2id-1' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions_catalog" (
	"perm" varchar(128) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"perm" varchar(128) NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("role_id","perm")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(255),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid,
	"client_id" uuid NOT NULL,
	"refresh_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_hash" varchar(64),
	"ua_hash" varchar(64),
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(256) NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(32),
	"target_id" uuid,
	"ip_hash" varchar(64),
	"ua_hash" varchar(64),
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'submitted' NOT NULL,
	"type" "project_type" DEFAULT 'marketing' NOT NULL,
	"site_domain" text,
	"staging_domain" text,
	"repo_url" text,
	"is_active" boolean DEFAULT true,
	"start_date" timestamp,
	"due_date" timestamp,
	"launched_at" timestamp,
	"monthly_rate_cents" integer,
	"deposit_amount_cents" integer,
	"billing_status" "project_billing_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_redirect_uris" ADD CONSTRAINT "client_redirect_uris_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_perm_permissions_catalog_perm_fk" FOREIGN KEY ("perm") REFERENCES "public"."permissions_catalog"("perm") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_codes_hash_uq" ON "auth_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "auth_codes_user_client_idx" ON "auth_codes" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "auth_codes_expires_idx" ON "auth_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_uri_uq" ON "client_redirect_uris" USING btree ("client_id","uri");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_key_uq" ON "clients" USING btree ("key");--> statement-breakpoint
CREATE INDEX "clients_aud_idx" ON "clients" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "devices_seen_idx" ON "devices" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "invites_client_idx" ON "invites" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_open_email_uq" ON "invites" USING btree ("client_id","email") WHERE accepted_at IS NULL AND revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "otp_user_purpose_idx" ON "otps" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "otps_expires_idx" ON "otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "role_perms_perm_idx" ON "role_permissions" USING btree ("perm");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_client_key_uq" ON "roles" USING btree ("client_id","key");--> statement-breakpoint
CREATE INDEX "roles_client_idx" ON "roles" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_one_default_per_client" ON "roles" USING btree ("client_id") WHERE "roles"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "user_client_role_uq" ON "user_roles" USING btree ("user_id","client_id","role_id");--> statement-breakpoint
CREATE INDEX "user_client_idx" ON "user_roles" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_device_idx" ON "sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "sessions_client_idx" ON "sessions" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_uq" ON "sessions" USING btree ("refresh_hash");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");