"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-50 backdrop-blur-sm bg-background/90">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#5E6AD2] flex items-center justify-center text-white shadow-sm">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <span className="font-bold tracking-tight text-foreground text-lg">CPGRAMS <span className="text-[#5E6AD2] text-xs uppercase tracking-widest font-semibold ml-1">Privacy Layer</span></span>
      </Link>
      
      <div className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
        <Link 
          href="/" 
          className={`hover:text-foreground transition-colors ${pathname === "/" ? "text-[#5E6AD2] font-semibold" : ""}`}
        >
          Home
        </Link>
        <Link 
          href="/dashboard" 
          className={`hover:text-foreground transition-colors ${pathname.startsWith("/dashboard") || pathname.startsWith("/grievance") || (pathname.startsWith("/case") && !pathname.startsWith("/officer")) ? "text-[#5E6AD2] font-semibold" : ""}`}
        >
          Citizen Portal
        </Link>
        <Link 
          href="/officer" 
          className={`hover:text-foreground transition-colors ${pathname.startsWith("/officer") ? "text-[#5E6AD2] font-semibold" : ""}`}
        >
          Officer Portal
        </Link>
        <Link 
          href="/status" 
          className={`hover:text-foreground transition-colors ${pathname === "/status" ? "text-[#5E6AD2] font-semibold" : ""}`}
        >
          Track Status
        </Link>
        <Link 
          href="/disclosure" 
          className={`hover:text-foreground transition-colors ${pathname === "/disclosure" ? "text-[#5E6AD2] font-semibold" : ""}`}
        >
          Disclosure Authority
        </Link>
      </div>
    </nav>
  );
}
