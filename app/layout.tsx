import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sismo · Hospitales",
  description:
    "Búsqueda y verificación comunitaria de ingresos hospitalarios tras el sismo en Venezuela.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
