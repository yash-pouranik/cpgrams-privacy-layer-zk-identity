"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { Scale, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, KeyRound, LogOut, Lock } from "lucide-react";

interface DisclosureRequest {
  _id: string;
  caseId: string;
  requestingOfficerId: string;
  justification: string;
  status: string;
  createdAt: string;
}

export default function DisclosureAuthorityConsole() {
  const [authorityToken, setAuthorityToken] = useState<string>("");
  const [inputToken, setInputToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requests, setRequests] = useState<DisclosureRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ [id: string]: string }>({});
  const { toast } = useToast();
  
  const [activeApproveReq, setActiveApproveReq] = useState<DisclosureRequest | null>(null);
  const [courtOrderRefInput, setCourtOrderRefInput] = useState("");
  const [approving, setApproving] = useState(false);

  const [activeRejectReq, setActiveRejectReq] = useState<DisclosureRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const defaultSecret = process.env.NEXT_PUBLIC_AUTHORITY_TOKEN || "authority-secret-change-me";

  const fetchRequestsWithToken = useCallback(async (tokenToUse: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/pending`, {
        headers: { "X-Authority-Token": tokenToUse },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        setIsAuthenticated(true);
        setAuthorityToken(tokenToUse);
        sessionStorage.setItem("authorityToken", tokenToUse);
        
        // Strict Role Isolation: Purge any citizen or officer session
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("officerToken");
        sessionStorage.removeItem("officerUser");
      } else {
        setIsAuthenticated(false);
        setAuthError("Invalid Authority Secret. Access Denied.");
      }
    } catch (err: any) {
      console.error("Failed to fetch disclosure requests:", err);
      setAuthError(err.message || "Failed to reach backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("authorityToken");
    if (savedToken) {
      fetchRequestsWithToken(savedToken);
    }
  }, [fetchRequestsWithToken]);

  const handleUnlockConsole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    setAuthError(null);
    fetchRequestsWithToken(inputToken.trim());
  };

  const handleQuickFillDemoToken = () => {
    setInputToken(defaultSecret);
    setAuthError(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("authorityToken");
    setIsAuthenticated(false);
    setAuthorityToken("");
    setInputToken("");
    setShowLogoutConfirm(false);
    toast({
      title: "Console Locked",
      description: "Disclosure Authority session ended successfully.",
    });
  };

  const handleExecuteApprove = async () => {
    if (!activeApproveReq || !courtOrderRefInput.trim()) return;
    setApproving(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/${activeApproveReq._id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Authority-Token": authorityToken,
        },
        body: JSON.stringify({ courtOrderRef: courtOrderRefInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setRevealed((prev) => ({ ...prev, [activeApproveReq._id]: data.email }));
        toast({
          title: "Disclosure Approved",
          description: `Identity reverse lookup successful for Case ${activeApproveReq.caseId}.`,
        });
        setActiveApproveReq(null);
        setCourtOrderRefInput("");
      } else {
        const err = await res.json();
        toast({
          title: "Authorization Failed",
          description: err.error || "Failed to approve disclosure",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Approval error:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleExecuteReject = async () => {
    if (!activeRejectReq) return;
    setRejecting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/${activeRejectReq._id}/reject`, {
        method: "POST",
        headers: {
          "X-Authority-Token": authorityToken,
        },
      });

      if (res.ok) {
        toast({
          title: "Request Rejected",
          description: `Disclosure request for Case ${activeRejectReq.caseId} has been formally rejected.`,
        });
        setRequests((prev) => prev.filter((r) => r._id !== activeRejectReq._id));
        setActiveRejectReq(null);
      }
    } catch (err: any) {
      console.error("Rejection error:", err);
    } finally {
      setRejecting(false);
    }
  };

  // 1. If not authenticated, render High-Security Passcode Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto w-full px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-red-50 border border-red-200 rounded-2xl mb-3 text-red-600 shadow-sm">
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">Disclosure Authority Console</h1>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
            Restricted judicial desk for court-authorized citizen identity reverse-lookups.
          </p>
        </div>

        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-[#E5E7EB] bg-gray-50/50">
            <CardTitle className="text-base text-[#111827] flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" /> Enter Authority Master Secret
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleUnlockConsole} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#6B7280]" /> Master Token Secret
                </label>
                <Input
                  type="password"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Enter authority secret..."
                  className="bg-[#F9FAFB] font-mono text-xs"
                  required
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !inputToken.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-xs h-10 shadow-sm"
              >
                {loading ? "Authenticating..." : "Unlock Authority Console"}
              </Button>
            </form>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Evaluation Demo:</span>
              <button
                type="button"
                onClick={handleQuickFillDemoToken}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
              >
                Quick Fill Authority Token
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Authenticated Console
  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
      <div className="border-b border-[#E5E7EB] pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl text-red-600">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                Disclosure Authority Console
              </h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Court-authorized judicial identity reveal review desk.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Badge variant="destructive" className="bg-red-600 text-white font-mono text-xs px-3 py-1">
            Judicial Authority Session Active
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Lock Console
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Pending Disclosure Requests</h2>
          <p className="text-xs text-[#6B7280]">
            Department officers cannot view citizen identities without approval from this console.
          </p>
        </div>
        <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold text-red-700 bg-red-50 border-red-200">
          {requests.length} Pending
        </Badge>
      </div>

      {requests.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No Pending Requests</h3>
          <p className="text-xs text-[#6B7280] mt-1">All citizen identities remain 100% protected and unrevealed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => (
            <Card key={req._id} className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#E5E7EB] bg-gray-50/50">
                <div>
                  <CardTitle className="font-mono text-lg text-red-600 font-bold">
                    Case {req.caseId}
                  </CardTitle>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Requested by: <strong className="font-mono text-gray-900">{req.requestingOfficerId}</strong>
                  </p>
                </div>
                <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-800 font-semibold">
                  Pending Court Order
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Officer Justification / Order Reference
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-800 font-mono leading-relaxed">
                    {req.justification}
                  </div>
                </div>

                {revealed[req._id] && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1 animate-in fade-in">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      REVEALED CITIZEN IDENTITY:
                    </p>
                    <p className="font-mono text-sm text-emerald-800 font-bold">{revealed[req._id]}</p>
                    <p className="text-[11px] text-emerald-700 pt-1">
                      Reverse-lookup successful from CivID SSO Database. Officer portal notified.
                    </p>
                  </div>
                )}
              </CardContent>
              
              {!revealed[req._id] && (
                <CardFooter className="flex justify-end gap-3 border-t border-[#E5E7EB] pt-4 bg-gray-50/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveRejectReq(req)}
                    className="text-xs text-gray-700 border-gray-300 hover:bg-gray-100"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-red-500" /> Reject Request
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setActiveApproveReq(req);
                      setCourtOrderRefInput(req.justification || "");
                    }}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    <Scale className="w-3.5 h-3.5 mr-1" /> Approve & Reveal Identity
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Judicial Approval Modal */}
      <Dialog open={activeApproveReq !== null} onOpenChange={(open) => { if (!open && !approving) setActiveApproveReq(null); }}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader className="gap-2">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl w-fit">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Authorize Judicial Identity Disclosure
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              You are authorizing a reverse-lookup to decrypt the real citizen email for Case <strong className="font-mono text-indigo-600">{activeApproveReq?.caseId}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Enter Verified Court Order Number</label>
              <Input
                value={courtOrderRefInput}
                onChange={(e) => setCourtOrderRefInput(e.target.value)}
                placeholder="e.g. HC-2026-881 / MAG-DEL-094"
                className="bg-[#F9FAFB] font-mono text-xs"
              />
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 leading-tight">
              Legal Notice: This action is permanently recorded in the immutable audit trail and will be visible to legal auditors.
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveApproveReq(null)} disabled={approving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteApprove}
              disabled={approving || !courtOrderRefInput.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {approving ? "Decrypting..." : "Confirm & Decrypt Identity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Confirmation Modal */}
      <ConfirmModal
        isOpen={activeRejectReq !== null}
        onClose={() => setActiveRejectReq(null)}
        onConfirm={handleExecuteReject}
        loading={rejecting}
        title="Reject Identity Disclosure?"
        icon="warning"
        variant="warning"
        confirmText="Confirm Rejection"
        description={
          <div className="space-y-2 pt-1 text-xs text-gray-600">
            <p>Are you sure you want to dismiss the disclosure request for Case <strong className="text-gray-900">{activeRejectReq?.caseId}</strong>?</p>
            <p className="text-gray-500">The officer will NOT be granted access to citizen PII and the case will remain strictly pseudonymous.</p>
          </div>
        }
      />

      {/* Logout / Lock Console Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Lock Disclosure Authority Console?"
        icon="logout"
        variant="destructive"
        confirmText="Lock Console"
        description="Are you sure you want to lock the judicial console? You will need to enter the Master Authority Secret again to access pending court disclosure files."
      />
    </div>
  );
}
