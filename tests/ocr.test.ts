import { describe, it, expect } from "vitest";
import { parseOcrJson } from "@/lib/ocr";

describe("parseOcrJson", () => {
  it("maps a JSON array to records (cédula normalized, low confidence, place resolved)", () => {
    const txt = JSON.stringify([
      { nombre: "Perez Maria", cedula: "12345678", edad: 35, sexo: "F", estado: "" },
    ]);
    const out = parseOcrJson(txt, "img1", "Hospital Lidice");
    expect(out.length).toBe(1);
    expect(out[0].fullName).toBe("Perez Maria");
    expect(out[0].cedula).toBe("V12345678");
    expect(out[0].age).toBe(35);
    expect(out[0].sex).toBe("F");
    expect(out[0].hospitalSlug).toBe("hospital-lidice");
    expect(out[0].confidence).toBeLessThan(0.6);
    expect(out[0].rowRef).toBe("img1#0");
  });

  it("resolves a known hospital from the place", () => {
    const out = parseOcrJson(JSON.stringify([{ nombre: "X Y" }]), "i", "Hospital Vargas de Caracas");
    expect(out[0].hospitalSlug).toBe("vargas-caracas");
  });

  it("strips markdown code fences", () => {
    const txt = "```json\n[{\"nombre\":\"Ana Diaz\"}]\n```";
    expect(parseOcrJson(txt, "i", "X").length).toBe(1);
  });

  it("returns [] for malformed or empty output", () => {
    expect(parseOcrJson("no soy json", "i", "X")).toEqual([]);
    expect(parseOcrJson("[]", "i", "X")).toEqual([]);
    expect(parseOcrJson("{}", "i", "X")).toEqual([]);
  });

  it("drops rows without a name", () => {
    expect(parseOcrJson(JSON.stringify([{ cedula: "12345678" }]), "i", "X")).toEqual([]);
  });
});
