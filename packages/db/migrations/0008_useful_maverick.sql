CREATE TYPE "public"."billing_record_status" AS ENUM('active', 'past_due', 'cancelled', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."billing_record_type" AS ENUM('recurring', 'one_time');--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_payment_intent_id" text,
	"type" "billing_record_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" "billing_record_status" NOT NULL,
	"interval_months" integer,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_records_project_idx" ON "billing_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "billing_records_client_idx" ON "billing_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "billing_records_status_idx" ON "billing_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_records_stripe_customer_idx" ON "billing_records" USING btree ("stripe_customer_id");