import { del, list, type ListBlobResultBlob } from "@vercel/blob";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { mediaAssets } from "../src/db/schema";

config({ path: ".env.local" });

const prefix = process.env.MEDIA_RECONCILE_PREFIX?.trim() || "praise/";
const graceHours = Number(process.env.MEDIA_RECONCILE_GRACE_HOURS ?? "24");
const deleteEnabled = process.env.MEDIA_RECONCILE_DELETE === "true";
const deleteConfirmation = process.env.MEDIA_RECONCILE_CONFIRM === "DELETE_ORPHAN_MEDIA";
const expectedDatabase = process.env.MEDIA_RECONCILE_EXPECTED_DATABASE?.trim();
const expectedBlobStoreId = process.env.MEDIA_RECONCILE_EXPECTED_BLOB_STORE_ID?.trim();

function assertConfiguration() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    throw new Error("BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID is required for media reconciliation.");
  }
  if (!prefix || prefix.includes("..") || prefix.startsWith("/")) {
    throw new Error("MEDIA_RECONCILE_PREFIX must be a relative, non-traversal prefix.");
  }
  if (!Number.isFinite(graceHours) || graceHours < 1) {
    throw new Error("MEDIA_RECONCILE_GRACE_HOURS must be at least 1 hour.");
  }
  if (deleteEnabled && !deleteConfirmation) {
    throw new Error("Deletion is disabled until MEDIA_RECONCILE_CONFIRM=DELETE_ORPHAN_MEDIA is supplied.");
  }
  if (deleteEnabled && (!expectedDatabase || !expectedBlobStoreId || !process.env.BLOB_STORE_ID)) {
    throw new Error("Deletion also requires MEDIA_RECONCILE_EXPECTED_DATABASE, MEDIA_RECONCILE_EXPECTED_BLOB_STORE_ID and BLOB_STORE_ID.");
  }
}

async function listAllBlobs() {
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return blobs;
}

function safeStoragePath(storageKey: string) {
  try {
    return new URL(storageKey).pathname;
  } catch {
    return "[invalid-storage-key]";
  }
}

async function main() {
  assertConfiguration();
  const [identityRows, rows, blobs] = await Promise.all([
    db.execute(sql`select current_database() as database_name`),
    db.select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey }).from(mediaAssets),
    listAllBlobs(),
  ]);
  const databaseName = String(identityRows.rows[0]?.database_name ?? "unknown");
  if (deleteEnabled && databaseName !== expectedDatabase) {
    throw new Error(`Refusing deletion: connected database '${databaseName}' does not match MEDIA_RECONCILE_EXPECTED_DATABASE.`);
  }
  if (deleteEnabled && process.env.BLOB_STORE_ID !== expectedBlobStoreId) {
    throw new Error("Refusing deletion: connected Blob store does not match MEDIA_RECONCILE_EXPECTED_BLOB_STORE_ID.");
  }
  const linkedStorageKeys = new Set(rows.map((row) => row.storageKey));
  const listedBlobUrls = new Set(blobs.map((blob) => blob.url));
  const cutoff = Date.now() - graceHours * 60 * 60 * 1000;
  const orphanCandidates = blobs.filter((blob) => !linkedStorageKeys.has(blob.url) && blob.uploadedAt.getTime() < cutoff);
  const missingBlobReferences = rows.filter((row) => !listedBlobUrls.has(row.storageKey));

  const report = {
    mode: deleteEnabled && deleteConfirmation ? "delete" : "dry-run",
    prefix,
    graceHours,
    databaseName,
    blobStoreId: process.env.BLOB_STORE_ID ? process.env.BLOB_STORE_ID : "token-only",
    scannedBlobs: blobs.length,
    linkedDatabaseRows: rows.length,
    missingBlobReferences: missingBlobReferences.map((row) => ({ id: row.id, pathname: safeStoragePath(row.storageKey) })),
    orphanCandidates: orphanCandidates.map((blob) => ({
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
    })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (!deleteEnabled) return;

  for (const blob of orphanCandidates) {
    await del(blob.url);
  }
  console.log(JSON.stringify({ deleted: orphanCandidates.length }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Media reconciliation failed.");
  process.exitCode = 1;
});
