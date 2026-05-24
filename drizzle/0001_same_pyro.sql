CREATE TABLE "consumable_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"supplier" text,
	"purchase_price" integer DEFAULT 0 NOT NULL,
	"purchase_quantity" integer DEFAULT 1 NOT NULL,
	"purchase_unit" text DEFAULT 'pack' NOT NULL,
	"total_smallest_unit" integer DEFAULT 0 NOT NULL,
	"smallest_unit" text DEFAULT 'pcs' NOT NULL,
	"cost_per_smallest_unit" integer DEFAULT 0 NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "consumable_usages" jsonb DEFAULT '[]'::jsonb NOT NULL;