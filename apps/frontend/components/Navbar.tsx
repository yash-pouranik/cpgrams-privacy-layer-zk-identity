"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-sm bg-primary" />
        <span className="font-semibold tracking-tight text-foreground">CivID</span>
      </Link>
      
      <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Citizen</Link>
        <Link href="/officer" className="hover:text-foreground transition-colors">Officer</Link>
        <Link href="/status" className="hover:text-foreground transition-colors">Status</Link>
        <Link href="/disclosure" className="hover:text-foreground transition-colors">Disclosure</Link>
      </div>
    </nav>
  );
}
