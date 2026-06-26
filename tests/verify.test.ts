import { describe, it, expect } from "vitest";
import { nextStatusAfterVerification, validateVerification } from "@/lib/verify";

describe("nextStatusAfterVerification", () => {
  it("promotes to community_confirmed at 2 confirmations", () => {
    expect(nextStatusAfterVerification("unverified", 2, 0)).toBe("community_confirmed");
  });
  it("stays unverified below the threshold", () => {
    expect(nextStatusAfterVerification("unverified", 1, 0)).toBe("unverified");
  });
  it("never overrides a coordinator verification", () => {
    expect(nextStatusAfterVerification("coordinator_verified", 9, 9)).toBe("coordinator_verified");
  });
  it("flags disputed when disputes dominate", () => {
    expect(nextStatusAfterVerification("community_confirmed", 0, 2)).toBe("disputed");
  });
  it("confirmations outweigh a single dispute", () => {
    expect(nextStatusAfterVerification("unverified", 3, 1)).toBe("community_confirmed");
  });
});

describe("validateVerification", () => {
  const valid = {
    claim: "confirm",
    verifierName: "Ana Vecina",
    verifierContact: "0414-1234567",
    hasProof: true,
  };
  it("accepts a complete verification", () => {
    const res = validateVerification(valid);
    expect(res.ok).toBe(true);
  });
  it("requires a valid claim", () => {
    const res = validateVerification({ ...valid, claim: "maybe" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.claim).toBeTruthy();
  });
  it("requires name, contact and proof", () => {
    const res = validateVerification({ claim: "confirm" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.verifierName).toBeTruthy();
      expect(res.errors.verifierContact).toBeTruthy();
      expect(res.errors.proof).toBeTruthy();
    }
  });
});
