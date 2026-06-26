import { describe, it, expect } from "vitest";
import { normalizeCedula, maskCedula } from "@/lib/cedula";

describe("normalizeCedula", () => {
  it("normalizes punctuation and spacing", () => {
    expect(normalizeCedula("V-12.345.678")).toBe("V12345678");
    expect(normalizeCedula("v 12345678")).toBe("V12345678");
    expect(normalizeCedula("12.345.678")).toBe("V12345678"); // default nationality V
  });
  it("keeps a valid non-V nationality letter", () => {
    expect(normalizeCedula("E-1.234.567")).toBe("E1234567");
  });
  it("rejects junk", () => {
    expect(normalizeCedula("")).toBeNull();
    expect(normalizeCedula("abc")).toBeNull();
    expect(normalizeCedula("V123")).toBeNull(); // too short
    expect(normalizeCedula("V1234567890")).toBeNull(); // too long
  });
});

describe("maskCedula", () => {
  it("masks all but the first four digits, per the documented format", () => {
    expect(maskCedula("V12345678")).toBe("V-12.34X.XXX");
    expect(maskCedula("E1234567")).toBe("E-12.34X.XX");
  });
  it("returns input unchanged if it is not a normalized cedula", () => {
    expect(maskCedula("garbage")).toBe("garbage");
  });
});
