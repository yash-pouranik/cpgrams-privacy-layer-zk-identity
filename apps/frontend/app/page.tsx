import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/login`;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="py-24 px-6 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#111827]">
            File grievances without fear
          </h1>
          <p className="text-xl md:text-2xl text-[#6B7280] max-w-3xl leading-relaxed">
            CivID verifies who you are. CPGRAMS never reveals it to the officer handling your case.
          </p>
          <div className="pt-8">
            <Button asChild size="lg" className="bg-[#5E6AD2] hover:bg-[#828FFF] text-white text-lg px-8 py-6 rounded-md shadow-sm">
              <a href={loginUrl}>Continue with CivID &rarr;</a>
            </Button>
          </div>
        </section>

        <section className="py-20 px-6 max-w-6xl mx-auto bg-transparent">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-[#F9FAFB] border-[#E5E7EB] shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-[#5E6AD2]/10 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5E6AD2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <CardTitle className="text-[#111827] text-xl">Verified Identity</CardTitle>
              </CardHeader>
              <CardContent className="text-[#6B7280]">
                You are authenticated through government-approved channels to ensure legitimate filings without fraud.
              </CardContent>
            </Card>

            <Card className="bg-[#F9FAFB] border-[#E5E7EB] shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-[#5E6AD2]/10 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5E6AD2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <CardTitle className="text-[#111827] text-xl">Protected Identity</CardTitle>
              </CardHeader>
              <CardContent className="text-[#6B7280]">
                The officer handling your grievance never sees your personal details. They only see an anonymous Case ID.
              </CardContent>
            </Card>

            <Card className="bg-[#F9FAFB] border-[#E5E7EB] shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-[#5E6AD2]/10 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5E6AD2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <CardTitle className="text-[#111827] text-xl">Controlled Disclosure</CardTitle>
              </CardHeader>
              <CardContent className="text-[#6B7280]">
                Your identity can only be revealed through a court-authorized, fully auditable workflow.
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center border-t border-[#E5E7EB] text-[#6B7280] text-sm mt-auto">
        Powered by CivID &middot; Build What Moves India
      </footer>
    </div>
  );
}
