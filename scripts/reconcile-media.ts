import { del, list, type ListBlobResultBlob } from "@vercel/blob";
import { config } from "dotenv";

import { db } from "../src/db";
import { mediaAssets } from "../src/db/schema";

config({ path: ".env.local" });

const prefix = process.env.MEDIA_RECONCILE_PREFIX?.trim() || "praise/";
const graceHours = Number(process.env.MEDIA_RECONCILE_GRACE_HOURS ?? "24");
const deleteEnabled = process.env.MEDIA_RECONCILE_DELETE === "true";
const deleteConfirmation = process.env.MEDIA_RECONCILE_CONFIRM === "DELETE_ORPHAN_MEDIA";

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

async function main() {
  assertConfiguration();
  const [rows, blobs] = await Promise.all([
    db.select({ storageKey: mediaAssets.storageKey }).from(mediaAssets),
    listAllBlobs(),
  ]);
  const linkedStorageKeys = new Set(rows.map((row) => row.storageKey));
  const cutoff = Date.now() - graceHours * 60 * 60 * 1000;
  const orphanCandidates = blobs.filter((blob) => !linkedStorageKeys.has(blob.url) && blob.uploadedAt.getTime() < cutoff);

  const report = {
    mode: deleteEnabled && deleteConfirmation ? "delete" : "dry-run",
    prefix,
    graceHours,
    scannedBlobs: blobs.length,
    linkedDatabaseRows: rows.length,
    orphanCandidates: orphanCandidates.map((blob) => ({
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
    })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (!deleteEnabled) return;
  if (!deleteConfirmation) {
    throw new Error("Deletion is disabled until MEDIA_RECONCILE_CONFIRM=DELETE_ORPHAN_MEDIA is supplied.");
  }

  for (const blob of orphanCandidates) {
    await del(blob.url);
  }
  console.log(JSON.stringify({ deleted: orphanCandidates.length }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Media reconciliation failed.");
  process.exitCode = 1;
});
