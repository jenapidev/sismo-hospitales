import { cookies } from "next/headers";

export type Locale = "es" | "en";

export interface Dict {
  title: string;
  tagline: string;
  searchPlaceholder: string;
  search: string;
  report: string;
  stats: string;
  noResults: string;
  orReport: string;
}

const DICT: Record<Locale, Dict> = {
  es: {
    title: "Sismo · Hospitales",
    tagline: "Busca a una persona ingresada tras el sismo por nombre o cédula.",
    searchPlaceholder: "Nombre o cédula…",
    search: "Buscar",
    report: "+ Reportar a una persona",
    stats: "Estadísticas",
    noResults: "No se encontraron resultados para",
    orReport: "reporta a esta persona",
  },
  en: {
    title: "Earthquake · Hospitals",
    tagline: "Search for someone admitted after the earthquake by name or ID.",
    searchPlaceholder: "Name or ID…",
    search: "Search",
    report: "+ Report a person",
    stats: "Statistics",
    noResults: "No results found for",
    orReport: "report this person",
  },
};

/** Read the locale cookie (server). Defaults to Spanish. */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return c.get("locale")?.value === "en" ? "en" : "es";
}

export function dict(locale: Locale): Dict {
  return DICT[locale];
}
