import { Montserrat } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Impostor - Roles",
  description: "Juego local de roles para pasar el celular entre jugadores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
