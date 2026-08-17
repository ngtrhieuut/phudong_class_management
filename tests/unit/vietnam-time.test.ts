import { describe, expect, it } from "vitest";

import { getVietnamDayRange } from "../../src/lib/time/vietnam";

describe("Vietnam calendar day ranges", () => {
  it("uses the Vietnam day boundary instead of the server local timezone", () => {
    const beforeMidnight = getVietnamDayRange(new Date("2026-08-17T16:59:59.999Z"));
    expect(beforeMidnight.from.toISOString()).toBe("2026-08-16T17:00:00.000Z");
    expect(beforeMidnight.to.toISOString()).toBe("2026-08-17T17:00:00.000Z");

    const atMidnight = getVietnamDayRange(new Date("2026-08-17T17:00:00.000Z"));
    expect(atMidnight.from.toISOString()).toBe("2026-08-17T17:00:00.000Z");
    expect(atMidnight.to.toISOString()).toBe("2026-08-18T17:00:00.000Z");
  });
});
