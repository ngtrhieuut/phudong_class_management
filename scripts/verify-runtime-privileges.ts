import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL_RUNTIME, DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  const rows = await sql`
    SELECT
      current_user AS "currentUser",
      has_schema_privilege(current_user, 'public', 'USAGE') AS "publicUsage",
      has_schema_privilege(current_user, 'public', 'CREATE') AS "publicCreate",
      has_table_privilege(current_user, 'public.students', 'SELECT') AS "studentsSelect",
      has_table_privilege(current_user, 'public.students', 'INSERT') AS "studentsInsert",
      has_table_privilege(current_user, 'public.students', 'UPDATE') AS "studentsUpdate",
      has_table_privilege(current_user, 'public.students', 'DELETE') AS "studentsDelete",
      has_table_privilege(current_user, 'public.students', 'TRUNCATE') AS "studentsTruncate",
      has_table_privilege(current_user, 'public.students', 'REFERENCES') AS "studentsReferences",
      has_table_privilege(current_user, 'public.students', 'TRIGGER') AS "studentsTrigger"
  `;

  const snapshot = rows[0] as Record<string, string | boolean> | undefined;
  if (!snapshot) {
    console.error("Runtime privilege query returned no row.");
    process.exit(1);
  }

  const failures: string[] = [];
  const requireRuntimeRole = process.env.REQUIRE_RUNTIME_ROLE === "true";
  if (requireRuntimeRole && snapshot.currentUser !== "phudong_runtime") failures.push(`unexpected runtime role: ${snapshot.currentUser}`);
  if (snapshot.publicUsage !== true) failures.push("USAGE on public schema is missing");
  if (snapshot.publicCreate === true) failures.push("CREATE on public schema is still granted");
  for (const privilege of ["studentsSelect", "studentsInsert", "studentsUpdate", "studentsDelete"] as const) {
    if (snapshot[privilege] !== true) failures.push(`${privilege} is missing`);
  }
  for (const privilege of ["studentsTruncate", "studentsReferences", "studentsTrigger"] as const) {
    if (snapshot[privilege] === true) failures.push(`${privilege} must not be granted`);
  }

  console.log(JSON.stringify({ snapshot, requireRuntimeRole, failures }, null, 2));
  if (failures.length) process.exit(1);
}

void main();
