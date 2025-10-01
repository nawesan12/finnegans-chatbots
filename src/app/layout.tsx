import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import GlobalEventHandler from "@/components/GlobalEventHandler";

export const metadata: Metadata = {
  title: "Finnegans Chatbots",
  description:
    "Orquesta experiencias conversacionales, automatiza atenciones y controla los canales claves de tu operación desde un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GlobalEventHandler />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
