const VIETNAM_OFFSET_MINUTES = 7 * 60;
const MINUTE_MS = 60 * 1000;

export type UtcDateRange = {
  from: Date;
  to: Date;
};

/**
 * Returns the half-open UTC range for the Vietnam calendar day containing now.
 * Vietnam has no DST, so a fixed UTC+7 offset is appropriate here.
 */
export function getVietnamDayRange(now = new Date()): UtcDateRange {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MINUTES * MINUTE_MS);
  const from = new Date(
    Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate()) -
      VIETNAM_OFFSET_MINUTES * MINUTE_MS,
  );
  return {
    from,
    to: new Date(from.getTime() + 24 * 60 * MINUTE_MS),
  };
}
