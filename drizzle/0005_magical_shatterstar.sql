ALTER TABLE "treatments" ADD COLUMN "device_electricity_costs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "shot_cartridge_costs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "staff_fee_costs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "include_overhead" boolean DEFAULT true NOT NULL;