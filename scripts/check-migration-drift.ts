import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

type SnapshotTable = {
  columns: Record<string, { name: string }>;
  indexes: Record<string, { name: string }>;
  uniqueConstraints: Record<string, unknown>;
  compositePrimaryKeys: Record<string, unknown>;
};

type Snapshot = {
  tables: Record<string, SnapshotTable>;
  enums: Record<string, { values: string[] }>;
};

type MigrationJournal = {
  entries: Array<{ tag: string; when: number }>;
};

type MigrationJournalRow = {
  hash: string;
  created_at: string | number | null;
};

const databaseUrl = process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL_RUNTIME, DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);
const migrationRoot = resolve(process.cwd(), "src", "db", "migrations");
const journal = JSON.parse(readFileSync(resolve(migrationRoot, "meta", "_journal.json"), "utf8")) as MigrationJournal;
const latestEntry = journal.entries.at(-1);
if (!latestEntry) {
  throw new Error("The Drizzle migration journal has no entries.");
}
const latestMigrationTag = latestEntry.tag;

const latestIndex = String(journal.entries.length - 1).padStart(4, "0");
const snapshot = JSON.parse(readFileSync(resolve(migrationRoot, "meta", `${latestIndex}_snapshot.json`), "utf8")) as Snapshot;

const expectedMigrationEntries = journal.entries.map((entry) => ({
  tag: entry.tag,
  hash: createHash("sha256")
    .update(readFileSync(resolve(migrationRoot, `${entry.tag}.sql`)))
    .digest("hex"),
  createdAt: String(entry.when),
}));

function publicObjectName(value: string) {
  return value.startsWith("public.") ? value.slice("public.".length) : null;
}

function sorted(values: Iterable<string>) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function difference(expected: Iterable<string>, actual: Set<string>) {
  return sorted(expected).filter((value) => !actual.has(value));
}

async function main() {
  const [tableRows, columnRows, indexRows, enumRows, migrationTableRows, migrationTableRegclass] = await Promise.all([
    sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
    sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
    sql`select tablename, indexname from pg_indexes where schemaname = 'public'`,
    sql`select t.typname as enum_name, e.enumlabel as enum_value from pg_type t inner join pg_namespace n on n.oid = t.typnamespace inner join pg_enum e on e.enumtypid = t.oid where n.nspname = 'public' order by t.typname, e.enumsortorder`,
    sql`select table_schema, table_name from information_schema.tables where table_name = '__drizzle_migrations'`,
    sql`select to_regclass('drizzle.__drizzle_migrations') as migration_table`,
  ]);

  const migrationJournalPresent = migrationTableRows.length > 0 && Boolean(migrationTableRegclass[0]?.migration_table);
  const migrationJournalRows = migrationJournalPresent
    ? ((await sql`select hash, created_at from drizzle.__drizzle_migrations order by created_at, id`) as MigrationJournalRow[])
    : [];
  const actualMigrationEntries = migrationJournalRows.map((row) => ({ hash: String(row.hash), createdAt: String(row.created_at) }));
  const expectedMigrationHashes = expectedMigrationEntries.map(({ hash, createdAt }) => ({ hash, createdAt }));
  const migrationJournalMatches =
    migrationJournalPresent &&
    actualMigrationEntries.length === expectedMigrationHashes.length &&
    actualMigrationEntries.every((entry, index) => {
      const expected = expectedMigrationHashes[index];
      return entry.hash === expected.hash && entry.createdAt === expected.createdAt;
    });

  const expectedTables = sorted(Object.keys(snapshot.tables).map(publicObjectName).filter((value): value is string => Boolean(value)));
  const expectedColumns = sorted(
    Object.entries(snapshot.tables).flatMap(([qualifiedName, table]) => {
      const tableName = publicObjectName(qualifiedName);
      return tableName ? Object.keys(table.columns).map((column) => `${tableName}.${column}`) : [];
    }),
  );
  const expectedIndexes = sorted(
    Object.entries(snapshot.tables).flatMap(([qualifiedName, table]) => {
      const tableName = publicObjectName(qualifiedName);
      if (!tableName) return [];
      return [
        `${tableName}_pkey`,
        ...Object.values(table.indexes).map((index) => index.name),
        ...Object.keys(table.uniqueConstraints),
        ...Object.keys(table.compositePrimaryKeys),
      ];
    }),
  );
  const expectedEnums = new Map(
    Object.entries(snapshot.enums)
      .map(([qualifiedName, enumDefinition]) => [publicObjectName(qualifiedName), enumDefinition.values] as const)
      .filter((entry): entry is readonly [string, string[]] => Boolean(entry[0])),
  );

  const actualTables = new Set(tableRows.map((row) => String(row.table_name)));
  const actualColumns = new Set(columnRows.map((row) => `${String(row.table_name)}.${String(row.column_name)}`));
  const actualIndexes = new Set(indexRows.map((row) => String(row.indexname)));
  const actualEnums = new Map<string, string[]>();
  for (const row of enumRows) {
    const name = String(row.enum_name);
    actualEnums.set(name, [...(actualEnums.get(name) ?? []), String(row.enum_value)]);
  }

  const missingTables = difference(expectedTables, actualTables);
  const unexpectedTables = sorted([...actualTables].filter((table) => !expectedTables.includes(table)));
  const missingColumns = difference(expectedColumns, actualColumns);
  const unexpectedColumns = sorted([...actualColumns].filter((column) => !expectedColumns.includes(column)));
  const missingIndexes = difference(expectedIndexes, actualIndexes);
  const unexpectedIndexes = sorted([...actualIndexes].filter((index) => !expectedIndexes.includes(index)));
  const enumDiff = sorted(expectedEnums.keys()).flatMap((enumName) => {
    const expected = expectedEnums.get(enumName) ?? [];
    const actual = actualEnums.get(enumName) ?? [];
    return JSON.stringify(expected) === JSON.stringify(actual)
      ? []
      : [{ enumName, expected, actual }];
  });

  const report = {
    database: "public",
    expectedMigrationTags: journal.entries.map((entry) => entry.tag),
    expectedMigrationEntries,
    latestMigrationTag,
    migrationJournal: migrationJournalPresent ? "present" : "missing",
    migrationJournalTables: migrationTableRows,
    migrationJournalEntries: migrationJournalRows,
    migrationJournalMatches,
    expectedTableCount: expectedTables.length,
    actualTableCount: actualTables.size,
    missingTables,
    unexpectedTables,
    missingColumns,
    unexpectedColumns,
    missingIndexes,
    unexpectedIndexes,
    enumDiff,
  };
  console.log(JSON.stringify(report, null, 2));

  const schemaDrift = missingTables.length || unexpectedTables.length || missingColumns.length || unexpectedColumns.length || missingIndexes.length || unexpectedIndexes.length || enumDiff.length;
  if (schemaDrift || (process.env.REQUIRE_MIGRATION_JOURNAL === "true" && (!migrationJournalPresent || !migrationJournalMatches))) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration drift check failed.");
  process.exitCode = 1;
});
