import type { Metadata } from "next";
import "@fontsource/geist/100.css";
import "@fontsource/geist/200.css";
import "@fontsource/geist/300.css";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "@fontsource/geist/800.css";
import "@fontsource/geist/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumina BI | Conversational AI Engine",
  description: "Pitch-black, high-density event-driven Conversational BI platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-geist antialiased bg-background text-white">
        {children}
      </body>
    </html>
  );
}
