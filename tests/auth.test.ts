import { describe, it, expect } from "vitest";
import { isCoordinatorEmail } from "@/lib/auth";

describe("isCoordinatorEmail", () => {
  const list = "Owner@Example.com, ana@ngo.org";
  it("matches an allowlisted email case-insensitively", () => {
    expect(isCoordinatorEmail("owner@example.com", list)).toBe(true);
    expect(isCoordinatorEmail("ANA@ngo.org", list)).toBe(true);
  });
  it("rejects non-listed emails", () => {
    expect(isCoordinatorEmail("intruder@evil.com", list)).toBe(false);
  });
  it("rejects when email or list is empty", () => {
    expect(isCoordinatorEmail("", list)).toBe(false);
    expect(isCoordinatorEmail("owner@example.com", "")).toBe(false);
    expect(isCoordinatorEmail(null, list)).toBe(false);
  });
});
