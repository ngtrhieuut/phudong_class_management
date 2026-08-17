import { describe, expect, it } from "vitest";

import { isValidRewardRedemptionTransition } from "../../src/lib/classroom/reward-service";

describe("reward redemption lifecycle", () => {
  it("allows only the requested and approved transitions", () => {
    expect(isValidRewardRedemptionTransition("requested", "approved")).toBe(true);
    expect(isValidRewardRedemptionTransition("requested", "rejected")).toBe(true);
    expect(isValidRewardRedemptionTransition("requested", "cancelled")).toBe(true);
    expect(isValidRewardRedemptionTransition("approved", "fulfilled")).toBe(true);
    expect(isValidRewardRedemptionTransition("approved", "cancelled")).toBe(true);
  });

  it("rejects double updates and transitions from terminal states", () => {
    expect(isValidRewardRedemptionTransition("requested", "requested")).toBe(false);
    expect(isValidRewardRedemptionTransition("requested", "fulfilled")).toBe(false);
    expect(isValidRewardRedemptionTransition("approved", "approved")).toBe(false);
    expect(isValidRewardRedemptionTransition("fulfilled", "fulfilled")).toBe(false);
    expect(isValidRewardRedemptionTransition("rejected", "approved")).toBe(false);
    expect(isValidRewardRedemptionTransition("cancelled", "approved")).toBe(false);
    expect(isValidRewardRedemptionTransition("fulfilled", "cancelled")).toBe(false);
  });
});
