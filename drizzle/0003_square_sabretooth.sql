ALTER TABLE "fixed_cost_settings" ADD COLUMN "cost_modes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "fixed_cost_settings" ADD COLUMN "cost_notes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "fixed_cost_settings" ADD COLUMN "staff_costs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "fixed_cost_settings" ADD COLUMN "electricity_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;