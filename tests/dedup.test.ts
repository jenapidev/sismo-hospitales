import { describe, it, expect } from "vitest";
import { groupDuplicates, type DedupRow } from "@/lib/dedup";

function row(over: Partial<DedupRow> & Pick<DedupRow, "id">): DedupRow {
  return { cedula: null, fullName: "X Y", age: 30, hospitalId: "h1", ...over };
}

describe("groupDuplicates", () => {
  it("groups the same cédula across two hospitals", () => {
    const groups = groupDuplicates([
      row({ id: "a", cedula: "V12345678", hospitalId: "h1" }),
      row({ id: "b", cedula: "V12345678", hospitalId: "h2" }),
    ]);
    const ids = [...groups.values()][0];
    expect(groups.size).toBe(1);
    expect(new Set(ids)).toEqual(new Set(["a", "b"]));
  });

  it("does NOT group the same cédula within one hospital", () => {
    const groups = groupDuplicates([
      row({ id: "a", cedula: "V12345678", hospitalId: "h1" }),
      row({ id: "b", cedula: "V12345678", hospitalId: "h1" }),
    ]);
    expect(groups.size).toBe(0);
  });

  it("falls back to name+age across hospitals when cédula is absent", () => {
    const groups = groupDuplicates([
      row({ id: "a", cedula: null, fullName: "PEREZ MARIA", age: 35, hospitalId: "h1" }),
      row({ id: "b", cedula: null, fullName: "Pérez  María", age: 35, hospitalId: "h2" }),
    ]);
    expect(groups.size).toBe(1);
    expect(new Set([...groups.values()][0])).toEqual(new Set(["a", "b"]));
  });

  it("does NOT group on name+age within one hospital", () => {
    const groups = groupDuplicates([
      row({ id: "a", cedula: null, fullName: "PEREZ MARIA", age: 35, hospitalId: "h1" }),
      row({ id: "b", cedula: null, fullName: "PEREZ MARIA", age: 35, hospitalId: "h1" }),
    ]);
    expect(groups.size).toBe(0);
  });

  it("never groups rows with no cédula and no age", () => {
    const groups = groupDuplicates([
      row({ id: "a", cedula: null, fullName: "PEREZ MARIA", age: null, hospitalId: "h1" }),
      row({ id: "b", cedula: null, fullName: "PEREZ MARIA", age: null, hospitalId: "h2" }),
    ]);
    expect(groups.size).toBe(0);
  });

  it("does not group distinct people", () => {
    const groups = groupDuplicates([
      row({ id: "a", cedula: "V11111111", hospitalId: "h1" }),
      row({ id: "b", cedula: "V22222222", hospitalId: "h2" }),
    ]);
    expect(groups.size).toBe(0);
  });
});
