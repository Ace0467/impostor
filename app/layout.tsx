import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impostor - Roles",
  description: "Juego local de roles para pasar el celular entre jugadores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
