import { describe, it, expect } from "vitest";
import { parseTabular } from "@/lib/parser/tabular";
import { slugify } from "@/lib/parser/hospitals";

describe("slugify", () => {
  it("makes accent-free dashed slugs", () => {
    expect(slugify("Hospital Lídice")).toBe("hospital-lidice");
    expect(slugify("Parque del Oeste")).toBe("parque-del-oeste");
  });
});

describe("parseTabular — consolidated (.xlsx style, hospital column)", () => {
  const rows = [
    ["APELLIDO(S)", "NOMBRE(S)", "CÉDULA/ID", "EDAD", "SEXO", "HOSPITAL/CENTRO", "ESTADO/CONDICIÓN", "COMENTARIOS"],
    ["Perez", "Maria", "12345678", "35", "F", "Hospital Vargas de Caracas", "", "Trauma"],
    ["Colina", "Abel", "", "", "", "Centro desplazados / refugio", "", "Lista"],
  ];
  const out = parseTabular(rows, "consolidado.xlsx");

  it("parses each data row (skips header)", () => {
    expect(out.length).toBe(2);
  });
  it("combines name, normalizes cédula, resolves a known hospital", () => {
    expect(out[0].fullName).toBe("Perez Maria");
    expect(out[0].cedula).toBe("V12345678");
    expect(out[0].age).toBe(35);
    expect(out[0].hospitalSlug).toBe("vargas-caracas");
    expect(out[0].rowRef).toMatch(/^consolidado\.xlsx#\d+$/);
  });
  it("slugifies an unknown centro into a new place", () => {
    expect(out[1].cedula).toBeNull();
    expect(out[1].hospitalSlug).toBe("centro-desplazados-refugio");
    expect(out[1].hospitalName).toBe("Centro desplazados / refugio");
  });
});

describe("parseTabular — sheet style (junk first row, no hospital column)", () => {
  const rows = [
    ["", "CARPETA COMPARTIDA https://...", "", "", "", ""],
    ["fuente", "nombre", "apellido", "cedula", "edad", "INFO Adicional"],
    ["foto.jpeg", "Javier", "Espinoza", "14820620", "50", ""],
  ];
  const out = parseTabular(rows, "Hospital Lidice", "Hospital Lídice");

  it("finds the header past the junk row and uses the fallback place", () => {
    expect(out.length).toBe(1);
    expect(out[0].fullName).toBe("Espinoza Javier");
    expect(out[0].cedula).toBe("V14820620");
    expect(out[0].age).toBe(50);
    expect(out[0].hospitalSlug).toBe("hospital-lidice");
  });
});
