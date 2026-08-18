import { sql } from "drizzle-orm";

import { classes } from "@/db/schema";

/**
 * Teacher/guardian activity must stop when either the class or its school year
 * is archived. Keep this predicate server-side so stale clients cannot mutate
 * a class that is no longer in the active teaching flow.
 */
export function operationalClassCondition() {
  return sql`coalesce(${classes.settingsJson}->>'archived', 'false') <> 'true'
    and exists (
      select 1
      from school_years
      where school_years.id = ${classes.schoolYearId}
        and school_years.active = true
    )`;
}
