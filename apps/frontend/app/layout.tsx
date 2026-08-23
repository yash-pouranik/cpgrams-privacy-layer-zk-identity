import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/toast"; // wait, usually it's toaster.tsx
import "./globals.css";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Privacy-Preserving CPGRAMS",
  description: "Verify the citizen. Protect the identity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col bg-[#FFFFFF] text-[#111827] font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
