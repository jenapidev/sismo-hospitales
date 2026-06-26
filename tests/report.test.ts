import { describe, it, expect } from "vitest";
import { validateReport } from "@/lib/report";

const valid = {
  fullName: "Perez Maria",
  hospitalId: "h1",
  status: "admitted",
  cedula: "V-12.345.678",
  age: "35",
  sex: "F",
  submitterName: "Juan Reporta",
  submitterContact: "juan@example.com",
  hasProof: true,
};

describe("validateReport", () => {
  it("accepts a complete report and normalizes cédula/age", () => {
    const res = validateReport(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.cedula).toBe("V12345678");
      expect(res.value.age).toBe(35);
      expect(res.value.status).toBe("admitted");
      expect(res.value.fullName).toBe("Perez Maria");
    }
  });

  it("requires name, hospital, submitter name + contact, and proof", () => {
    const res = validateReport({});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.fullName).toBeTruthy();
      expect(res.errors.hospitalId).toBeTruthy();
      expect(res.errors.submitterName).toBeTruthy();
      expect(res.errors.submitterContact).toBeTruthy();
      expect(res.errors.proof).toBeTruthy();
    }
  });

  it("rejects an invalid cédula when one is provided", () => {
    const res = validateReport({ ...valid, cedula: "123" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.cedula).toBeTruthy();
  });

  it("allows an empty cédula (often unknown)", () => {
    const res = validateReport({ ...valid, cedula: "" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.cedula).toBeNull();
  });

  it("rejects an out-of-range age", () => {
    const res = validateReport({ ...valid, age: "999" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.age).toBeTruthy();
  });

  it("rejects an invalid status", () => {
    const res = validateReport({ ...valid, status: "bogus" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.status).toBeTruthy();
  });
});
