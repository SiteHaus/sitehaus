-- Step 1: Create permission_modules table first
CREATE TABLE "permission_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(255),
	"is_core" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "permission_modules_key_uq" ON "permission_modules" USING btree ("key");
--> statement-breakpoint
-- Step 2: Insert the core IAM module
INSERT INTO "permission_modules" ("key", "name", "description", "is_core")
VALUES ('iam', 'Identity & Access', 'User authentication, authorization, and identity management', true);
--> statement-breakpoint
-- Step 3: Add module_id column as NULLABLE first
ALTER TABLE "permissions_catalog" ADD COLUMN "module_id" uuid;
--> statement-breakpoint
ALTER TABLE "permissions_catalog" ADD COLUMN "description" varchar(255);
--> statement-breakpoint
-- Step 4: Update existing permissions to reference the IAM module
UPDATE "permissions_catalog"
SET "module_id" = (SELECT "id" FROM "permission_modules" WHERE "key" = 'iam');
--> statement-breakpoint
-- Step 5: Make module_id NOT NULL now that all rows have a value
ALTER TABLE "permissions_catalog" ALTER COLUMN "module_id" SET NOT NULL;
--> statement-breakpoint
-- Step 6: Add foreign key constraint and index
ALTER TABLE "permissions_catalog" ADD CONSTRAINT "permissions_catalog_module_id_permission_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."permission_modules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "permissions_catalog_module_idx" ON "permissions_catalog" USING btree ("module_id");
--> statement-breakpoint
-- Step 7: Create client_modules table
CREATE TABLE "client_modules" (
	"client_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"enabled_at" timestamp with time zone DEFAULT now(),
	"enabled_by" uuid,
	CONSTRAINT "client_modules_pk" PRIMARY KEY("client_id","module_id")
);
--> statement-breakpoint
ALTER TABLE "client_modules" ADD CONSTRAINT "client_modules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_modules" ADD CONSTRAINT "client_modules_module_id_permission_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."permission_modules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_modules" ADD CONSTRAINT "client_modules_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Step 8: Auto-enable IAM module for all existing clients
INSERT INTO "client_modules" ("client_id", "module_id", "enabled")
SELECT c.id, pm.id, true
FROM "clients" c
CROSS JOIN "permission_modules" pm
WHERE pm.key = 'iam';
