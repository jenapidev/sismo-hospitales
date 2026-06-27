import { describe, it, expect } from "vitest";
import { validateCenter, validateItem } from "@/lib/acopio";

const center = {
  name: "Acopio La Candelaria",
  address: "Av. Urdaneta, Caracas",
  lat: "10.5",
  lng: "-66.9",
  managerName: "Maria Perez",
  managerCedula: "V-12.345.678",
  orgName: "Cruz Roja",
  orgId: "J-12345678-9",
  aidDestination: "Hospital Vargas",
};

describe("validateCenter", () => {
  it("accepts a complete center and normalizes types", () => {
    const r = validateCenter(center);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.lat).toBe(10.5);
      expect(r.value.lng).toBe(-66.9);
      expect(r.value.managerCedula).toBe("V12345678");
      expect(r.value.orgName).toBe("Cruz Roja");
    }
  });
  it("requires name, address, manager and a valid pin", () => {
    const r = validateCenter({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeTruthy();
      expect(r.errors.address).toBeTruthy();
      expect(r.errors.managerName).toBeTruthy();
      expect(r.errors.lat).toBeTruthy();
    }
  });
  it("rejects out-of-range coordinates", () => {
    const r = validateCenter({ ...center, lat: "200" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.lat).toBeTruthy();
  });
  it("rejects an invalid cédula but allows an empty one", () => {
    expect(validateCenter({ ...center, managerCedula: "123" }).ok).toBe(false);
    const r = validateCenter({ ...center, managerCedula: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.managerCedula).toBeNull();
  });
});

describe("validateItem", () => {
  it("accepts a have/need item", () => {
    expect(validateItem({ kind: "have", name: "Agua", quantity: "100", unit: "L" }).ok).toBe(true);
    expect(validateItem({ kind: "need", name: "Pañales" }).ok).toBe(true);
  });
  it("rejects a bad kind or missing name", () => {
    expect(validateItem({ kind: "x", name: "Agua" }).ok).toBe(false);
    expect(validateItem({ kind: "have", name: "" }).ok).toBe(false);
  });
  it("rejects a negative quantity", () => {
    expect(validateItem({ kind: "have", name: "Agua", quantity: "-5" }).ok).toBe(false);
  });
  it("accepts a known category and rejects an unknown one", () => {
    const ok = validateItem({ kind: "have", name: "Agua", category: "Agua" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.category).toBe("Agua");
    expect(validateItem({ kind: "have", name: "Agua", category: "Bogus" }).ok).toBe(false);
  });
});
