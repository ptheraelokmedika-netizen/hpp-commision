CREATE TABLE "hpp_commission_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_date" text NOT NULL,
	"invoice_number" text NOT NULL,
	"patient_name" text,
	"item_name" text NOT NULL,
	"treatment_id" text,
	"staff_id" text,
	"staff_name_snapshot" text NOT NULL,
	"role" text NOT NULL,
	"commission_mode" text NOT NULL,
	"base_amount" integer DEFAULT 0 NOT NULL,
	"normal_price" integer DEFAULT 0 NOT NULL,
	"final_allocated_amount" integer DEFAULT 0 NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"nominal" integer DEFAULT 0 NOT NULL,
	"calculated_commission" integer DEFAULT 0 NOT NULL,
	"hpp_cost" integer DEFAULT 0 NOT NULL,
	"estimated_profit" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hpp_commission_history" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_date" text NOT NULL,
	"invoice_number" text NOT NULL,
	"patient_name" text,
	"item_name" text NOT NULL,
	"treatment_id" text,
	"staff_id" text,
	"staff_name_snapshot" text NOT NULL,
	"role" text NOT NULL,
	"commission_mode" text NOT NULL,
	"base_amount" integer DEFAULT 0 NOT NULL,
	"normal_price" integer DEFAULT 0 NOT NULL,
	"final_allocated_amount" integer DEFAULT 0 NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"nominal" integer DEFAULT 0 NOT NULL,
	"calculated_commission" integer DEFAULT 0 NOT NULL,
	"hpp_cost" integer DEFAULT 0 NOT NULL,
	"estimated_profit" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hpp_commission_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hpp_staff_directory" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_code" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phone" text,
	"notes" text,
	"default_commission_eligible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hpp_staff_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hera_commission_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "hera_commission_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;