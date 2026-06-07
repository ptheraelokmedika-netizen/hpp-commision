CREATE TABLE "hpp_stock_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"material_name_snapshot" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"previous_stock" integer DEFAULT 0 NOT NULL,
	"new_stock" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"date" text NOT NULL,
	"pic" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hpp_stock_opnames" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"checked_by" text DEFAULT '' NOT NULL,
	"location" text,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "current_stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "stock_unit" text DEFAULT 'pcs' NOT NULL;--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "last_stock_check_date" text;--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "last_stock_check_by" text;--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "last_physical_stock" integer;--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "last_stock_difference" integer;--> statement-breakpoint
ALTER TABLE "consumable_items" ADD COLUMN "active" boolean DEFAULT true NOT NULL;