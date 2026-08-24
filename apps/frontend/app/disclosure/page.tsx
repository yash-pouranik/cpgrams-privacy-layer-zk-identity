"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DisclosureRequest {
  _id: string;
  caseId: string;
  requestingOfficerId: string;
  justification: string;
  status: string;
  createdAt: string;
}

export default function DisclosureAuthorityConsole() {
  const [requests, setRequests] = useState<DisclosureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<{ [id: string]: string }>({});
  
  const token = process.env.NEXT_PUBLIC_AUTHORITY_TOKEN || "authority-secret-change-me";

  const fetchRequests = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/pending`, {
        headers: { "X-Authority-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch disclosure requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    const courtOrderRef = prompt("ENTER COURT ORDER REFERENCE TO AUTHORIZE DISCLOSURE:");
    if (!courtOrderRef) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Authority-Token": token,
        },
        body: JSON.stringify({ courtOrderRef }),
      });

      if (res.ok) {
        const data = await res.json();
        setRevealed((prev) => ({ ...prev, [id]: data.email }));
        // Do not remove from UI immediately so authority can see the email
      } else {
        const err = await res.json();
        alert("Authorization failed: " + err.error);
      }
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this disclosure request?")) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/${id}/reject`, {
        method: "POST",
        headers: {
          "X-Authority-Token": token,
        },
      });

      if (res.ok) {
        alert("Request rejected.");
        setRequests((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (err) {
      console.error("Rejection error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 flex-1">
      <div className="mb-10 border-b border-[#E5E7EB] pb-6">
        <h1 className="text-3xl font-bold text-red-700 uppercase tracking-widest">Disclosure Authority Console</h1>
        <p className="text-[#6B7280] mt-2 font-mono text-sm">SECURE ENVIRONMENT. ALL ACTIONS ARE AUDIT-LOGGED.</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] p-12 text-center shadow-sm">
          <p className="text-[#6B7280] uppercase tracking-wide text-sm font-medium">No pending disclosure requests.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => (
            <Card key={req._id} className={`bg-white border shadow-sm ${revealed[req._id] ? 'border-red-500 bg-red-50' : 'border-[#E5E7EB]'}`}>
              <CardHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB] pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="font-mono text-lg font-bold text-[#111827]">
                    CASE ID: {req.caseId}
                  </CardTitle>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 uppercase text-xs tracking-wider">
                    {revealed[req._id] ? "Approved" : "Pending Authorization"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Requesting Officer</p>
                    <p className="font-mono text-[#111827]">{req.requestingOfficerId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Timestamp</p>
                    <p className="font-mono text-[#111827]">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Justification provided</p>
                  <div className="bg-[#F9FAFB] p-3 border border-[#E5E7EB] rounded font-mono text-sm text-[#111827]">
                    {req.justification}
                  </div>
                </div>

                {revealed[req._id] && (
                  <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded text-red-900">
                    <p className="font-bold mb-2 flex items-center gap-2">
                      <span>⚠️</span> IDENTITY DISCLOSED. THIS ACTION HAS BEEN LOGGED.
                    </p>
                    <p className="font-mono">Citizen Email: <span className="font-bold text-lg ml-2">{revealed[req._id]}</span></p>
                  </div>
                )}
              </CardContent>
              {!revealed[req._id] && (
                <CardFooter className="bg-[#F9FAFB] border-t border-[#E5E7EB] justify-end gap-4 pt-4 pb-4">
                  <Button variant="outline" onClick={() => handleReject(req._id)} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 uppercase tracking-wider text-xs">
                    Reject Request
                  </Button>
                  <Button onClick={() => handleApprove(req._id)} className="bg-green-600 hover:bg-green-700 text-white uppercase tracking-wider text-xs">
                    Authorize Disclosure
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
