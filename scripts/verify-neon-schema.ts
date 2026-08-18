import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL_RUNTIME, DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);
const requireLeastPrivilege = process.env.REQUIRE_LEAST_PRIVILEGE === "true";

const expectedTables = [
  "audit_logs",
  "badge_definitions",
  "behavior_templates",
  "class_memberships",
  "class_roles",
  "class_students",
  "classes",
  "guardian_invitations",
  "guardians",
  "level_definitions",
  "media_assets",
  "notifications",
  "organization_members",
  "organizations",
  "praise_post_students",
  "praise_posts",
  "reward_redemptions",
  "rewards",
  "school_years",
  "score_transactions",
  "student_badges",
  "student_guardians",
  "student_score_snapshots",
  "students",
  "task_assignments",
  "tasks",
  "teacher_notes",
  "users",
] as const;

const requiredColumns = {
  organizations: ["id", "name", "code"],
  organization_members: ["organization_id", "user_id", "role"],
  school_years: ["organization_id", "active"],
  classes: ["organization_id", "school_year_id", "homeroom_teacher_id", "settings_json"],
  students: ["organization_id", "student_code", "avatar_url", "status"],
  class_students: ["class_id", "student_id", "left_at"],
  class_memberships: ["class_id", "user_id", "role"],
  guardians: ["user_id", "email"],
  student_guardians: ["student_id", "guardian_id", "can_view"],
  score_transactions: ["class_id", "student_id", "source_transaction_id"],
  student_score_snapshots: ["class_id", "student_id", "lifetime_score", "spendable_stars"],
  reward_redemptions: ["class_id", "student_id", "reward_id", "status"],
  praise_posts: ["class_id", "author_user_id", "visibility"],
  praise_post_students: ["post_id", "student_id"],
  media_assets: ["owner_type", "owner_id", "storage_key", "mime_type"],
  teacher_notes: ["student_id", "class_id", "author_user_id", "body"],
  notifications: ["user_id", "read_at"],
  audit_logs: ["organization_id", "actor_user_id", "entity_type", "entity_id", "before_json", "after_json"],
} as const;

const requiredIndexes = [
  "organizations_code_key",
  "organization_members_organization_user_key",
  "organization_members_organization_role_idx",
  "school_years_organization_active_idx",
  "classes_organization_idx",
  "students_organization_code_key",
  "students_organization_status_idx",
  "class_students_class_active_idx",
  "class_memberships_class_user_key",
  "student_guardians_student_guardian_key",
  "score_transactions_student_occurred_idx",
  "student_score_snapshots_class_student_key",
  "reward_redemptions_class_requested_idx",
  "praise_posts_class_created_idx",
  "media_assets_owner_idx",
  "audit_logs_organization_created_idx",
] as const;

async function main() {
  const [tableRows, columnRows, indexRows, roleRows, rlsRows, policyRows] = await Promise.all([
    sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
    sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
    sql`select indexname from pg_indexes where schemaname = 'public'`,
    sql`select current_user as "currentUser", rolsuper as "superuser", rolcreaterole as "createRole", rolcreatedb as "createDb", rolbypassrls as "bypassRls" from pg_roles where rolname = current_user`,
    sql`select count(*)::int as "rlsTableCount" from pg_class inner join pg_namespace on pg_namespace.oid = pg_class.relnamespace where pg_namespace.nspname = 'public' and pg_class.relkind = 'r' and pg_class.relrowsecurity`,
    sql`select count(*)::int as "policyCount" from pg_policy inner join pg_class on pg_class.oid = pg_policy.polrelid inner join pg_namespace on pg_namespace.oid = pg_class.relnamespace where pg_namespace.nspname = 'public'`,
  ]);

  const actualTables = new Set(tableRows.map((row) => String(row.table_name)));
  const actualColumns = new Set(columnRows.map((row) => `${String(row.table_name)}.${String(row.column_name)}`));
  const actualIndexes = new Set(indexRows.map((row) => String(row.indexname)));
  const missingTables = expectedTables.filter((table) => !actualTables.has(table));
  const missingColumns = Object.entries(requiredColumns).flatMap(([table, columns]) => columns.filter((column) => !actualColumns.has(`${table}.${column}`)).map((column) => `${table}.${column}`));
  const missingIndexes = requiredIndexes.filter((index) => !actualIndexes.has(index));
  const unexpectedPublicTables = [...actualTables].filter((table) => !expectedTables.includes(table as (typeof expectedTables)[number])).sort();
  const role = roleRows[0] ?? null;
  const rls = rlsRows[0] ?? null;
  const policies = policyRows[0] ?? null;
  const leastPrivilegeViolations = requireLeastPrivilege
    ? role
      ? [
          role.superuser ? "SUPERUSER" : null,
          role.createRole ? "CREATEROLE" : null,
          role.createDb ? "CREATEDB" : null,
          role.bypassRls ? "BYPASSRLS" : null,
        ].filter((value): value is string => Boolean(value))
      : ["ROLE_AUDIT_UNAVAILABLE"]
    : [];

  const report = {
    database: "public",
    expectedTableCount: expectedTables.length,
    actualTableCount: actualTables.size,
    missingTables,
    missingColumns,
    missingIndexes,
    unexpectedPublicTables,
    role,
    rlsTableCount: Number(rls?.rlsTableCount ?? 0),
    policyCount: Number(policies?.policyCount ?? 0),
    leastPrivilegeRequired: requireLeastPrivilege,
    leastPrivilegeViolations,
  };

  console.log(JSON.stringify(report, null, 2));
  if (missingTables.length || missingColumns.length || missingIndexes.length || unexpectedPublicTables.length || leastPrivilegeViolations.length) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Neon schema verification failed.");
  process.exitCode = 1;
});
