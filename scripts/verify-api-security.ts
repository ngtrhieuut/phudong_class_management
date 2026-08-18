import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const apiRoot = join(process.cwd(), "src", "app", "api");
const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const externalProtocolRoutes = new Set([
  "src/app/api/auth/[...path]/route.ts",
  "src/app/api/teacher/praise/[postId]/media/route.ts",
]);

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}

const failures: string[] = [];
for (const file of routeFiles(apiRoot)) {
  const source = readFileSync(file, "utf8");
  const displayPath = relative(process.cwd(), file).replaceAll("\\", "/");
  const methods = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((match) => match[1]);
  const isExternalProtocolRoute = externalProtocolRoutes.has(displayPath);

  if (!isExternalProtocolRoute && !source.includes("noStoreHeaders") && !source.includes('"Cache-Control": "no-store"')) {
    failures.push(`${displayPath}: authenticated/API route must opt out of caching`);
  }

  for (const method of methods) {
    if (readOnlyMethods.has(method)) continue;
    if (isExternalProtocolRoute) {
      if (displayPath.includes("auth") && !source.includes("auth.handler")) failures.push(`${displayPath}: auth exception must delegate to the auth handler`);
      if (displayPath.includes("media") && (!source.includes("handleUpload") || !source.includes("blob.upload-completed"))) failures.push(`${displayPath}: Blob callback exception must verify the signed upload protocol`);
      continue;
    }
    if (!source.includes("isSameOrigin(request)")) {
      failures.push(`${displayPath}: ${method} must use the centralized same-origin policy`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`API security inventory passed for ${routeFiles(apiRoot).length} route files.`);
}
