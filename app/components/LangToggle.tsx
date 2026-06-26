"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LangToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const other: Locale = locale === "es" ? "en" : "es";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `locale=${other}; path=/; max-age=31536000`;
        router.refresh();
      }}
      className="text-xs text-gray-500 hover:underline"
      aria-label="Cambiar idioma / Switch language"
    >
      {locale === "es" ? "English" : "Español"}
    </button>
  );
}
