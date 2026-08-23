"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      sessionStorage.setItem("token", token);
      router.push("/dashboard");
      return;
    }

    // Fallback error if no token is present
    const err = searchParams.get("error");
    if (err) {
      setError(err);
    } else {
      setError("No token received from CivID SSO authentication.");
    }
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
