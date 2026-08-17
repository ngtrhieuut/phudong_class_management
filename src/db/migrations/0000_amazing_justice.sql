CREATE TYPE "public"."behavior_category" AS ENUM('positive', 'needs_improvement');--> statement-breakpoint
CREATE TYPE "public"."class_membership_role" AS ENUM('homeroom_teacher', 'teacher', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'undisclosed');--> statement-breakpoint
CREATE TYPE "public"."note_visibility" AS ENUM('teacher_only', 'guardian_visible');--> statement-breakpoint
CREATE TYPE "public"."organization_member_role" AS ENUM('admin', 'teacher', 'staff');--> statement-breakpoint
CREATE TYPE "public"."parent_visibility" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."praise_visibility" AS ENUM('class', 'related_guardians', 'teacher_only');--> statement-breakpoint
CREATE TYPE "public"."reward_redemption_status" AS ENUM('requested', 'approved', 'fulfilled', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('privilege', 'activity', 'physical', 'recognition');--> statement-breakpoint
CREATE TYPE "public"."score_transaction_type" AS ENUM('behavior', 'task', 'badge', 'reward', 'adjustment', 'manual');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'inactive', 'graduated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."task_assignment_status" AS ENUM('pending', 'completed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_completion_mode" AS ENUM('manual', 'rule_based');--> statement-breakpoint
CREATE TYPE "public"."task_scope" AS ENUM('student', 'group', 'class');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('draft', 'active', 'completed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'suspended', 'archived');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_entity_type_not_blank" CHECK (length(trim("audit_logs"."entity_type")) > 0),
	CONSTRAINT "audit_logs_entity_id_not_blank" CHECK (length(trim("audit_logs"."entity_id")) > 0),
	CONSTRAINT "audit_logs_action_not_blank" CHECK (length(trim("audit_logs"."action")) > 0)
);
--> statement-breakpoint
CREATE TABLE "badge_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	"rule_json" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badge_definitions_name_not_blank" CHECK (length(trim("badge_definitions"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "behavior_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"class_id" uuid,
	"name" text NOT NULL,
	"category" "behavior_category" NOT NULL,
	"default_points" integer NOT NULL,
	"icon" text,
	"color_token" text,
	"parent_visibility" "parent_visibility" DEFAULT 'visible' NOT NULL,
	"daily_limit" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "behavior_templates_name_not_blank" CHECK (length(trim("behavior_templates"."name")) > 0),
	CONSTRAINT "behavior_templates_daily_limit_check" CHECK ("behavior_templates"."daily_limit" is null or "behavior_templates"."daily_limit" > 0),
	CONSTRAINT "behavior_templates_points_match_category" CHECK (("behavior_templates"."category" = 'positive' and "behavior_templates"."default_points" > 0) or ("behavior_templates"."category" = 'needs_improvement' and "behavior_templates"."default_points" < 0))
);
--> statement-breakpoint
CREATE TABLE "class_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "class_membership_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_roles_class_id_key" UNIQUE("class_id","id"),
	CONSTRAINT "class_roles_name_not_blank" CHECK (length(trim("class_roles"."name")) > 0),
	CONSTRAINT "class_roles_sort_order_check" CHECK ("class_roles"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "class_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"seat_no" integer,
	"group_name" text,
	"class_role_id" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_students_class_student_key" UNIQUE("class_id","student_id"),
	CONSTRAINT "class_students_class_id_key" UNIQUE("class_id","id"),
	CONSTRAINT "class_students_seat_no_check" CHECK ("class_students"."seat_no" is null or "class_students"."seat_no" > 0),
	CONSTRAINT "class_students_membership_dates_check" CHECK ("class_students"."left_at" is null or "class_students"."left_at" >= "class_students"."joined_at")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"school_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grade" integer NOT NULL,
	"homeroom_teacher_id" uuid,
	"cover_url" text,
	"settings_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_name_not_blank" CHECK (length(trim("classes"."name")) > 0),
	CONSTRAINT "classes_grade_range_check" CHECK ("classes"."grade" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_full_name_not_blank" CHECK (length(trim("guardians"."full_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "level_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid,
	"name" text NOT NULL,
	"min_score" integer NOT NULL,
	"max_score" integer,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "level_definitions_name_not_blank" CHECK (length(trim("level_definitions"."name")) > 0),
	CONSTRAINT "level_definitions_min_score_check" CHECK ("level_definitions"."min_score" >= 0),
	CONSTRAINT "level_definitions_score_range_check" CHECK ("level_definitions"."max_score" is null or "level_definitions"."max_score" >= "level_definitions"."min_score"),
	CONSTRAINT "level_definitions_sort_order_check" CHECK ("level_definitions"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_owner_type_not_blank" CHECK (length(trim("media_assets"."owner_type")) > 0),
	CONSTRAINT "media_assets_storage_key_not_blank" CHECK (length(trim("media_assets"."storage_key")) > 0),
	CONSTRAINT "media_assets_mime_type_not_blank" CHECK (length(trim("media_assets"."mime_type")) > 0),
	CONSTRAINT "media_assets_dimensions_check" CHECK (("media_assets"."width" is null or "media_assets"."width" > 0) and ("media_assets"."height" is null or "media_assets"."height" > 0)),
	CONSTRAINT "media_assets_duration_check" CHECK ("media_assets"."duration" is null or "media_assets"."duration" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"deep_link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_type_not_blank" CHECK (length(trim("notifications"."type")) > 0),
	CONSTRAINT "notifications_title_not_blank" CHECK (length(trim("notifications"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"settings_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_not_blank" CHECK (length(trim("organizations"."name")) > 0),
	CONSTRAINT "organizations_code_not_blank" CHECK (length(trim("organizations"."code")) > 0)
);
--> statement-breakpoint
CREATE TABLE "praise_post_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "praise_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visibility" "praise_visibility" DEFAULT 'class' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "praise_posts_title_not_blank" CHECK (length(trim("praise_posts"."title")) > 0),
	CONSTRAINT "praise_posts_body_not_blank" CHECK (length(trim("praise_posts"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"cost_stars" integer NOT NULL,
	"status" "reward_redemption_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_redemptions_cost_stars_check" CHECK ("reward_redemptions"."cost_stars" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"reward_type" "reward_type" NOT NULL,
	"cost_stars" integer NOT NULL,
	"stock" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_class_id_key" UNIQUE("class_id","id"),
	CONSTRAINT "rewards_name_not_blank" CHECK (length(trim("rewards"."name")) > 0),
	CONSTRAINT "rewards_cost_stars_check" CHECK ("rewards"."cost_stars" >= 0),
	CONSTRAINT "rewards_stock_check" CHECK ("rewards"."stock" is null or "rewards"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "school_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_years_name_not_blank" CHECK (length(trim("school_years"."name")) > 0),
	CONSTRAINT "school_years_date_range_check" CHECK ("school_years"."ends_at" > "school_years"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "score_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"behavior_template_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"transaction_type" "score_transaction_type" NOT NULL,
	"lifetime_delta" integer DEFAULT 0 NOT NULL,
	"spendable_delta" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"source_transaction_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_transactions_non_zero_delta" CHECK ("score_transactions"."lifetime_delta" <> 0 or "score_transactions"."spendable_delta" <> 0),
	CONSTRAINT "score_transactions_reason_not_blank" CHECK (length(trim("score_transactions"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "student_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_by" uuid,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"receives_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_guardians_relationship_not_blank" CHECK (length(trim("student_guardians"."relationship")) > 0)
);
--> statement-breakpoint
CREATE TABLE "student_score_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"lifetime_score" integer DEFAULT 0 NOT NULL,
	"spendable_stars" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_score_snapshots_lifetime_non_negative" CHECK ("student_score_snapshots"."lifetime_score" >= 0),
	CONSTRAINT "student_score_snapshots_spendable_non_negative" CHECK ("student_score_snapshots"."spendable_stars" >= 0)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"student_code" text NOT NULL,
	"full_name" text NOT NULL,
	"short_name" text,
	"birth_date" date,
	"gender" "gender",
	"avatar_url" text,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_code_not_blank" CHECK (length(trim("students"."student_code")) > 0),
	CONSTRAINT "students_full_name_not_blank" CHECK (length(trim("students"."full_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "task_assignment_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"scope" "task_scope" NOT NULL,
	"reward_stars" integer DEFAULT 0 NOT NULL,
	"completion_mode" "task_completion_mode" DEFAULT 'manual' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" "task_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_title_not_blank" CHECK (length(trim("tasks"."title")) > 0),
	CONSTRAINT "tasks_reward_stars_check" CHECK ("tasks"."reward_stars" >= 0),
	CONSTRAINT "tasks_date_range_check" CHECK ("tasks"."due_at" >= "tasks"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "teacher_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"visibility" "note_visibility" DEFAULT 'teacher_only' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_notes_body_not_blank" CHECK (length(trim("teacher_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_display_name_not_blank" CHECK (length(trim("users"."display_name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_definitions" ADD CONSTRAINT "badge_definitions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_templates" ADD CONSTRAINT "behavior_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_templates" ADD CONSTRAINT "behavior_templates_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_roles" ADD CONSTRAINT "class_roles_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_role_fk" FOREIGN KEY ("class_id","class_role_id") REFERENCES "public"."class_roles"("class_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_homeroom_teacher_id_users_id_fk" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_definitions" ADD CONSTRAINT "level_definitions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_post_students" ADD CONSTRAINT "praise_post_students_post_id_praise_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."praise_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_post_students" ADD CONSTRAINT "praise_post_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_posts" ADD CONSTRAINT "praise_posts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "praise_posts" ADD CONSTRAINT "praise_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_class_fk" FOREIGN KEY ("class_id","reward_id") REFERENCES "public"."rewards"("class_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_class_student_fk" FOREIGN KEY ("class_id","student_id") REFERENCES "public"."class_students"("class_id","student_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_behavior_template_id_behavior_templates_id_fk" FOREIGN KEY ("behavior_template_id") REFERENCES "public"."behavior_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_class_student_fk" FOREIGN KEY ("class_id","student_id") REFERENCES "public"."class_students"("class_id","student_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_source_fk" FOREIGN KEY ("source_transaction_id") REFERENCES "public"."score_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_badge_id_badge_definitions_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_awarded_by_users_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_class_student_fk" FOREIGN KEY ("class_id","student_id") REFERENCES "public"."class_students"("class_id","student_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_score_snapshots" ADD CONSTRAINT "student_score_snapshots_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_score_snapshots" ADD CONSTRAINT "student_score_snapshots_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_score_snapshots" ADD CONSTRAINT "student_score_snapshots_class_student_fk" FOREIGN KEY ("class_id","student_id") REFERENCES "public"."class_students"("class_id","student_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_class_student_fk" FOREIGN KEY ("class_id","student_id") REFERENCES "public"."class_students"("class_id","student_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "badge_definitions_class_name_key" ON "badge_definitions" USING btree ("class_id","name");--> statement-breakpoint
CREATE INDEX "badge_definitions_class_active_idx" ON "badge_definitions" USING btree ("class_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "behavior_templates_organization_name_key" ON "behavior_templates" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "behavior_templates_class_name_key" ON "behavior_templates" USING btree ("class_id","name");--> statement-breakpoint
CREATE INDEX "behavior_templates_class_active_idx" ON "behavior_templates" USING btree ("class_id","active");--> statement-breakpoint
CREATE INDEX "behavior_templates_organization_active_idx" ON "behavior_templates" USING btree ("organization_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "class_memberships_class_user_key" ON "class_memberships" USING btree ("class_id","user_id");--> statement-breakpoint
CREATE INDEX "class_memberships_user_role_idx" ON "class_memberships" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "class_memberships_class_role_idx" ON "class_memberships" USING btree ("class_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "class_roles_class_name_key" ON "class_roles" USING btree ("class_id","name");--> statement-breakpoint
CREATE INDEX "class_roles_class_sort_idx" ON "class_roles" USING btree ("class_id","sort_order");--> statement-breakpoint
CREATE INDEX "class_students_student_idx" ON "class_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_students_class_active_idx" ON "class_students" USING btree ("class_id","left_at");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_school_year_name_key" ON "classes" USING btree ("school_year_id","name");--> statement-breakpoint
CREATE INDEX "classes_organization_idx" ON "classes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "classes_homeroom_teacher_idx" ON "classes" USING btree ("homeroom_teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_user_key" ON "guardians" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardians_phone_idx" ON "guardians" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "guardians_email_idx" ON "guardians" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "level_definitions_class_name_key" ON "level_definitions" USING btree ("class_id","name");--> statement-breakpoint
CREATE INDEX "level_definitions_class_score_idx" ON "level_definitions" USING btree ("class_id","min_score");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_assets_owner_idx" ON "media_assets" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","read_at","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_organization_user_key" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_members_organization_role_idx" ON "organization_members" USING btree ("organization_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "praise_post_students_post_student_key" ON "praise_post_students" USING btree ("post_id","student_id");--> statement-breakpoint
CREATE INDEX "praise_post_students_student_idx" ON "praise_post_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "praise_posts_class_created_idx" ON "praise_posts" USING btree ("class_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "praise_posts_author_idx" ON "praise_posts" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "reward_redemptions_student_status_idx" ON "reward_redemptions" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "reward_redemptions_class_requested_idx" ON "reward_redemptions" USING btree ("class_id","requested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "rewards_class_name_key" ON "rewards" USING btree ("class_id","name");--> statement-breakpoint
CREATE INDEX "rewards_class_active_cost_idx" ON "rewards" USING btree ("class_id","active","cost_stars");--> statement-breakpoint
CREATE UNIQUE INDEX "school_years_organization_name_key" ON "school_years" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "school_years_organization_active_idx" ON "school_years" USING btree ("organization_id","active");--> statement-breakpoint
CREATE INDEX "score_transactions_class_student_occurred_idx" ON "score_transactions" USING btree ("class_id","student_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "score_transactions_class_behavior_occurred_idx" ON "score_transactions" USING btree ("class_id","behavior_template_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "score_transactions_student_occurred_idx" ON "score_transactions" USING btree ("student_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "score_transactions_source_idx" ON "score_transactions" USING btree ("source_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_badges_student_class_badge_key" ON "student_badges" USING btree ("student_id","class_id","badge_id");--> statement-breakpoint
CREATE INDEX "student_badges_student_awarded_idx" ON "student_badges" USING btree ("student_id","awarded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "student_badges_class_awarded_idx" ON "student_badges" USING btree ("class_id","awarded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "student_guardians_student_guardian_key" ON "student_guardians" USING btree ("student_id","guardian_id");--> statement-breakpoint
CREATE INDEX "student_guardians_guardian_view_idx" ON "student_guardians" USING btree ("guardian_id","can_view");--> statement-breakpoint
CREATE INDEX "student_guardians_student_idx" ON "student_guardians" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_score_snapshots_class_student_key" ON "student_score_snapshots" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "student_score_snapshots_student_idx" ON "student_score_snapshots" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_organization_code_key" ON "students" USING btree ("organization_id","student_code");--> statement-breakpoint
CREATE INDEX "students_organization_status_idx" ON "students" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "task_assignments_task_student_key" ON "task_assignments" USING btree ("task_id","student_id");--> statement-breakpoint
CREATE INDEX "task_assignments_student_status_idx" ON "task_assignments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "task_assignments_task_status_idx" ON "task_assignments" USING btree ("task_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_class_id_key" ON "tasks" USING btree ("class_id","id");--> statement-breakpoint
CREATE INDEX "tasks_class_status_due_idx" ON "tasks" USING btree ("class_id","status","due_at");--> statement-breakpoint
CREATE INDEX "tasks_created_by_idx" ON "tasks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "teacher_notes_student_created_idx" ON "teacher_notes" USING btree ("student_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "teacher_notes_class_created_idx" ON "teacher_notes" USING btree ("class_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_key" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");