ALTER TABLE "guardians" ADD COLUMN "occupation" text;--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "birth_place" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "health_insurance_number" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "neighborhood" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "house_number" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "ward" text;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_birth_year_range_check" CHECK ("guardians"."birth_year" is null or "guardians"."birth_year" between 1900 and 2100);