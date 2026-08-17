CREATE TYPE "public"."guardian_invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "guardian_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"accepted_by_user_id" uuid,
	"guardian_email" text NOT NULL,
	"relationship" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" "guardian_invitation_status" DEFAULT 'pending' NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"receives_notifications" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_invitations_email_not_blank" CHECK (length(trim("guardian_invitations"."guardian_email")) > 0),
	CONSTRAINT "guardian_invitations_relationship_not_blank" CHECK (length(trim("guardian_invitations"."relationship")) > 0),
	CONSTRAINT "guardian_invitations_token_hash_not_blank" CHECK (length(trim("guardian_invitations"."token_hash")) > 0),
	CONSTRAINT "guardian_invitations_expiry_check" CHECK ("guardian_invitations"."expires_at" > "guardian_invitations"."created_at")
);
--> statement-breakpoint
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_class_student_fk" FOREIGN KEY ("class_id","student_id") REFERENCES "public"."class_students"("class_id","student_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guardian_invitations_token_hash_key" ON "guardian_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "guardian_invitations_class_student_status_idx" ON "guardian_invitations" USING btree ("class_id","student_id","status");--> statement-breakpoint
CREATE INDEX "guardian_invitations_organization_created_idx" ON "guardian_invitations" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "guardian_invitations_email_status_idx" ON "guardian_invitations" USING btree ("guardian_email","status");