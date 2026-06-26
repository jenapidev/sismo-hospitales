import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseDocument } from "@/lib/parser";
import { detectHospital } from "@/lib/parser/hospitals";

const master = readFileSync("tests/fixtures/master-registry.txt", "utf8");
const consolidado = readFileSync("tests/fixtures/consolidado.txt", "utf8");

describe("detectHospital", () => {
  it("maps known names (accent/spelling tolerant) to slugs", () => {
    expect(detectHospital("Hospital Universitario de Caracas")?.slug).toBe("universitario-caracas");
    expect(detectHospital("Hospital Domingo Luciani (El Llanito)")?.slug).toBe("luciani");
    expect(detectHospital("Hospital Perez Carreño")?.slug).toBe("perez-carreno");
    expect(detectHospital("Hopital Ricardo Baquero Gonzalez")?.slug).toBe("ricardo-baquero");
    expect(detectHospital("Hospital de Catia")?.slug).toBe("catia");
  });
  it("returns null when no hospital is present", () => {
    expect(detectHospital("just some text 123")).toBeNull();
  });
});

describe("parseDocument — master registry (no cédula)", () => {
  const out = parseDocument(master, "master.txt");

  it("parses every data row and skips headers", () => {
    expect(out.length).toBe(6);
  });

  it("extracts name, age, hospital; cédula is null in this format", () => {
    const r = out[0];
    expect(r.fullName).toBe("PEREZ MARIA");
    expect(r.age).toBe(35);
    expect(r.hospitalSlug).toBe("universitario-caracas");
    expect(r.cedula).toBeNull();
    expect(r.status).toBe("admitted");
    expect(r.rowRef).toMatch(/^master\.txt#\d+$/);
    expect(r.confidence).toBe(1);
  });

  it("handles a row with no age", () => {
    const lopez = out.find((r) => r.fullName === "LOPEZ CARLOS");
    expect(lopez).toBeTruthy();
    expect(lopez!.age).toBeNull();
    expect(lopez!.hospitalSlug).toBe("luciani");
  });
});

describe("parseDocument — consolidado (concatenated fields)", () => {
  const out = parseDocument(consolidado, "consol.txt");

  it("parses 5 rows", () => {
    expect(out.length).toBe(5);
  });

  it("splits a concatenated CI+age, with reduced confidence", () => {
    const r = out[0];
    expect(r.fullName).toBe("PEREZ MARIA");
    expect(r.cedula).toBe("V12345678");
    expect(r.age).toBe(35);
    expect(r.sex).toBe("F");
    expect(r.hospitalSlug).toBe("universitario-caracas");
    expect(r.confidence).toBeLessThan(1); // the CI/age boundary is a guess
  });

  it("treats a lone 7-digit number as cédula, not age", () => {
    const r = out.find((x) => x.fullName === "SILVA PEDRO")!;
    expect(r.cedula).toBe("V9876543");
    expect(r.age).toBeNull();
    expect(r.sex).toBe("m");
    expect(r.confidence).toBe(1);
  });

  it("treats a lone 2-digit number as age, not cédula", () => {
    const r = out.find((x) => x.fullName === "GOMEZ JUAN")!;
    expect(r.age).toBe(60);
    expect(r.cedula).toBeNull();
  });

  it("finds the same cédula at two different hospitals (for dedup)", () => {
    const maria = out.filter((x) => x.cedula === "V12345678");
    expect(maria.length).toBe(2);
    expect(new Set(maria.map((m) => m.hospitalSlug))).toEqual(
      new Set(["universitario-caracas", "vargas-caracas"])
    );
  });
});
