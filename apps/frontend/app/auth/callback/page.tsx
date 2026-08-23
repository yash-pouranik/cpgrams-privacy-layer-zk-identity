"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setError("No authorization code found in the URL.");
      return;
    }

    const exchangeToken = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const query = new URLSearchParams();
        query.append("code", code);
        if (state) query.append("state", state);

        const res = await fetch(`${apiUrl}/auth/callback?${query.toString()}`);
        if (!res.ok) {
          throw new Error("Authentication failed");
        }

        const data = await res.json();
        
        if (data.token) {
          sessionStorage.setItem("token", data.token);
          router.push("/dashboard");
        } else {
          throw new Error("No token returned");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "An error occurred during authentication.");
      }
    };

    exchangeToken();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h1 className="text-2xl font-bold text-[#111827] mb-4">Authentication Error</h1>
        <p className="text-[#ef4444]">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-[#111827] hover:bg-[#E5E7EB]"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      <p className="mt-4 text-[#6B7280] font-medium">Verifying your identity securely...</p>
    </div>
  );
}
