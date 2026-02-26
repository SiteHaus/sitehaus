ALTER TABLE "billing_records" ADD COLUMN "hosted_invoice_url" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "stripe_customer_id" text;