import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentTenant } from "@/lib/tenant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexHub CRM",
  description: "Gestão de agenda, clientes e financeiro para prestadores de serviço",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tenant = await getCurrentTenant();

  return (
    <html
      lang="pt-BR"
      data-palette={tenant?.theme_palette ?? "petroleo"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
