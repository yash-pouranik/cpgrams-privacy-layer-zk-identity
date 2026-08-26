"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, ArrowRight, Shield, Scale, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AshokaEmblem } from "./AshokaEmblem";
import { ConfirmModal } from "./ConfirmModal";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasCitizenToken, setHasCitizenToken] = useState(false);
  const [hasOfficerToken, setHasOfficerToken] = useState(false);
  const [hasAuthorityToken, setHasAuthorityToken] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutType, setLogoutType] = useState<"citizen" | "officer" | "authority" | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const officerToken = sessionStorage.getItem("officerToken");
    const authorityToken = sessionStorage.getItem("authorityToken");
    
    setHasCitizenToken(!!token);
    setHasOfficerToken(!!officerToken);
    setHasAuthorityToken(!!authorityToken);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleCitizenLogout = () => {
    sessionStorage.removeItem("token");
    setHasCitizenToken(false);
    setLogoutType(null);
    router.push("/");
  };

  const handleOfficerLogout = () => {
    sessionStorage.removeItem("officerToken");
    sessionStorage.removeItem("officerUser");
    setHasOfficerToken(false);
    setLogoutType(null);
    router.push("/officer/login");
  };

  const handleAuthorityLogout = () => {
    sessionStorage.removeItem("authorityToken");
    setHasAuthorityToken(false);
    setLogoutType(null);
    router.push("/disclosure");
  };

  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/login`;

  // Determine active context to prevent overlapping buttons
  const isOfficerRoute = pathname.startsWith("/officer");
  const isDisclosureRoute = pathname.startsWith("/disclosure");
  const isCitizenRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/case") || pathname.startsWith("/grievance");

  return (
    <nav className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <AshokaEmblem size={34} className="shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-950 text-lg tracking-tight font-sans">
                CPGRAMS
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-50 text-[#EA580C] border border-orange-200 px-1.5 py-0.5 rounded-sm">
                CivID Layer
              </span>
            </div>
          </Link>

          {/* Clean Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <Link
              href="/"
              className={`hover:text-slate-950 transition-colors ${
                pathname === "/" ? "text-[#EA580C] font-bold" : ""
              }`}
            >
              Home
            </Link>

            <a href="/#about" className="hover:text-slate-950 transition-colors">
              About
            </a>

            <a href="/#process" className="hover:text-slate-950 transition-colors">
              Process
            </a>

            <a href="/#exclusions" className="hover:text-slate-950 transition-colors">
              Exclusions
            </a>

            <Link
              href="/status"
              className={`hover:text-slate-950 transition-colors ${
                pathname === "/status" ? "text-[#EA580C] font-bold" : ""
              }`}
            >
              Track Status
            </Link>

            <Link
              href="/officer"
              className={`hover:text-slate-950 transition-colors ${
                isOfficerRoute ? "text-[#EA580C] font-bold" : ""
              }`}
            >
              Officer Portal
            </Link>

            <Link
              href="/disclosure"
              className={`hover:text-slate-950 transition-colors ${
                isDisclosureRoute ? "text-[#EA580C] font-bold" : ""
              }`}
            >
              Disclosure
            </Link>
          </div>

          {/* Clean Single Action CTA - Exclusively renders ONE active session role */}
          <div className="hidden md:flex items-center gap-3">
            {isDisclosureRoute && hasAuthorityToken ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-sm flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Authority Desk
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoutType("authority")}
                  className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Lock
                </Button>
              </div>
            ) : isOfficerRoute && hasOfficerToken ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/officer"
                  className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-sm transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Officer Desk
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoutType("officer")}
                  className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
                </Button>
              </div>
            ) : hasCitizenToken ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-sm transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-600" /> Citizen Desk
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoutType("citizen")}
                  className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
                </Button>
              </div>
            ) : hasOfficerToken ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/officer"
                  className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-sm transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Officer Desk
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoutType("officer")}
                  className="text-xs text-red-600 hover:bg-red-50 h-8 px-2"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
                </Button>
              </div>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-[#F6821F] hover:bg-[#E06D0C] text-slate-950 font-bold text-xs px-4 h-9 rounded-sm shadow-xs transition-all cursor-pointer font-sans"
              >
                <a href={loginUrl} className="flex items-center gap-1.5">
                  <span>Lodge Grievance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-sm text-slate-700 hover:text-slate-950 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-5 py-4 space-y-3 font-sans shadow-md">
          <div className="flex flex-col space-y-2 text-xs text-slate-700 font-medium">
            <Link href="/" className="p-2 hover:bg-slate-50 rounded-sm">
              Home
            </Link>
            <a href="/#about" className="p-2 hover:bg-slate-50 rounded-sm">
              About CPGRAMS
            </a>
            <a href="/#process" className="p-2 hover:bg-slate-50 rounded-sm">
              Redress Process
            </a>
            <a href="/#exclusions" className="p-2 hover:bg-slate-50 rounded-sm">
              Exclusions
            </a>
            <Link href="/status" className="p-2 hover:bg-slate-50 rounded-sm">
              Track Status
            </Link>
            <Link href="/dashboard" className="p-2 hover:bg-slate-50 rounded-sm">
              Citizen Portal
            </Link>
            <Link href="/officer" className="p-2 hover:bg-slate-50 rounded-sm">
              Officer Portal
            </Link>
            <Link href="/disclosure" className="p-2 hover:bg-slate-50 rounded-sm">
              Disclosure Authority
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
            {hasCitizenToken ? (
              <Button
                variant="outline"
                onClick={() => setLogoutType("citizen")}
                className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout Citizen
              </Button>
            ) : hasOfficerToken ? (
              <Button
                variant="outline"
                onClick={() => setLogoutType("officer")}
                className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout Officer
              </Button>
            ) : hasAuthorityToken ? (
              <Button
                variant="outline"
                onClick={() => setLogoutType("authority")}
                className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> Lock Authority Console
              </Button>
            ) : (
              <Button asChild className="w-full bg-[#F6821F] hover:bg-[#E06D0C] text-slate-950 font-bold text-xs h-9 rounded-sm">
                <a href={loginUrl}>Lodge Grievance (CivID SSO)</a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={logoutType !== null}
        onClose={() => setLogoutType(null)}
        onConfirm={
          logoutType === "citizen"
            ? handleCitizenLogout
            : logoutType === "officer"
            ? handleOfficerLogout
            : handleAuthorityLogout
        }
        title={
          logoutType === "citizen"
            ? "Log Out of Citizen Portal?"
            : logoutType === "officer"
            ? "Log Out of Officer Portal?"
            : "Lock Disclosure Authority Console?"
        }
        icon="logout"
        variant="destructive"
        confirmText={logoutType === "authority" ? "Lock Console" : "Yes, Log Out"}
        description={
          logoutType === "citizen"
            ? "Are you sure you want to end your active citizen session? You can log in again anytime via CivID SSO."
            : logoutType === "officer"
            ? "Are you sure you want to log out of the Officer Portal? Any unsaved case notes will be discarded."
            : "Are you sure you want to lock the judicial console? You will need to enter the Master Authority Secret again to access pending court files."
        }
      />
    </nav>
  );
}
