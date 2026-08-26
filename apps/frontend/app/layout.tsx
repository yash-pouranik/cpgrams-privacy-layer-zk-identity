import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { GovHeader } from "@/components/GovHeader";
import { Navbar } from "@/components/Navbar";
import { DemoJourneyGuide } from "@/components/DemoJourneyGuide";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CPGRAMS - Centralised Public Grievance Redress And Monitoring System",
  description: "Government of India &bull; Centralised Public Grievance Redress And Monitoring System with CivID Zero-Knowledge Privacy Architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 font-sans">
        <GovHeader />
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <DemoJourneyGuide />
      </body>
    </html>
  );
}
