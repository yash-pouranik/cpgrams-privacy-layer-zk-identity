"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedBanner } from "@/components/ProtectedBanner";
import { ChatThread } from "@/components/ChatThread";
import { CaseProgressStepper } from "@/components/CaseProgressStepper";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, HelpCircle, ShieldAlert, ArrowLeft, Clock, FileCheck, Loader2, Sparkles, Scale, FileText, CheckCircle2, ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";

interface CaseDetail {
  caseId: string;
  category: string;
  status: string;
  department: string | null;
  description: string;
  evidenceUrls?: string[];
  createdAt: string;
  votes?: number;
  atrRemarks?: string | null;
  atrUploadedAt?: string | null;
  appealReason?: string | null;
  appealFiledAt?: string | null;
  appealStatus?: string | null;
  appealOrderRemarks?: string | null;
  appealDecidedAt?: string | null;
}

interface Document {
  _id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByRole: "citizen" | "officer";
  createdAt: string;
}

interface Reminder {
  _id: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function OfficerCaseDetail() {
  const router = useRouter();
  const routeParams = useParams();
  const caseId = (routeParams?.caseId as string) || "";
  const { toast } = useToast();

  const [grievance, setGrievance] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusInput, setStatusInput] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  // ATR (Action Taken Report)
  const [atrRemarksInput, setAtrRemarksInput] = useState("");
  const [showAtrModal, setShowAtrModal] = useState(false);

  // Appellate Authority First Appeal Review (Stage 10)
  const [appealDecision, setAppealDecision] = useState<"upheld" | "fresh_action_ordered">("fresh_action_ordered");
  const [appealOrderRemarks, setAppealOrderRemarks] = useState("");
  const [decidingAppeal, setDecidingAppeal] = useState(false);
  const [showAppealDecisionConfirm, setShowAppealDecisionConfirm] = useState(false);

  const [justification, setJustification] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDisclosureConfirm, setShowDisclosureConfirm] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const [clarificationContent, setClarificationContent] = useState("");
  const [sendingClarification, setSendingClarification] = useState(false);
  const [showClarificationConfirm, setShowClarificationConfirm] = useState(false);
  
  const [officerToken, setOfficerToken] = useState<string>("");

  // Court-authorized identity disclosure (revealed after Disclosure Authority approves)
  const [disclosure, setDisclosure] = useState<{ revealedEmail: string; courtOrderRef: string; decidedAt: string } | null>(null);

  const fetchCase = useCallback(async (token: string) => {
    if (!caseId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem("officerToken");
        sessionStorage.removeItem("officerUser");
        router.push("/officer/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setGrievance(data);
        setStatusInput(data.status);
      }
      
      const docRes = await fetch(`${apiUrl}/officer/case/${caseId}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (docRes.ok) setDocuments(await docRes.json());
      
      const remRes = await fetch(`${apiUrl}/officer/case/${caseId}/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (remRes.ok) setReminders(await remRes.json());

      // Court-authorized disclosure status
      const discRes = await fetch(`${apiUrl}/officer/case/${caseId}/disclosure`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (discRes.ok) {
        const disc = await discRes.json();
        setDisclosure(disc.approved ? {
          revealedEmail: disc.revealedEmail,
          courtOrderRef: disc.courtOrderRef,
          decidedAt: disc.decidedAt,
        } : null);
      }
      
    } catch (err) {
      console.error("Failed to fetch case details:", err);
    } finally {
      setLoading(false);
    }
  }, [caseId, router]);

  useEffect(() => {
    const token = sessionStorage.getItem("officerToken");
    if (!token) {
      router.push("/officer/login");
      return;
    }
    setOfficerToken(token);
    fetchCase(token);
  }, [fetchCase, router]);

  const handleDownloadOfficerDoc = async (doc: Document) => {
    setDownloadingDocId(doc._id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}/documents/${doc._id}/download`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to download file");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName || `document-${doc._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Download Complete",
        description: `Saved ${doc.originalName}`,
      });
    } catch (err: any) {
      console.error("Download error:", err);
      toast({
        title: "Download Failed",
        description: err.message || "Could not download document.",
        variant: "destructive",
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusInput || statusInput === grievance?.status || !caseId) return;
    
    // If disposing case, ensure ATR remarks are captured
    if ((statusInput === 'disposed' || statusInput === 'resolved') && !atrRemarksInput.trim()) {
      setShowAtrModal(true);
      return;
    }

    setUpdating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({ 
          status: statusInput,
          atrRemarks: atrRemarksInput.trim() || undefined,
        }),
      });
      if (res.ok) {
        await fetchCase(officerToken);
        setShowStatusConfirm(false);
        setShowAtrModal(false);
        setAtrRemarksInput("");
        toast({
          title: "Status Updated",
          description: `Case ${caseId} updated to ${statusInput.replace('_', ' ')}.`,
        });
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAppealDecision = async () => {
    if (!caseId) return;
    setDecidingAppeal(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}/appeal-decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({
          decision: appealDecision,
          appealOrderRemarks: appealOrderRemarks.trim(),
        }),
      });

      if (res.ok) {
        setShowAppealDecisionConfirm(false);
        setAppealOrderRemarks("");
        toast({
          title: "Appellate Order Issued",
          description: appealDecision === 'fresh_action_ordered' ? "Case re-opened for field correction." : "Initial resolution upheld.",
        });
        fetchCase(officerToken);
      }
    } catch (err) {
      console.error("Failed to decide appeal", err);
    } finally {
      setDecidingAppeal(false);
    }
  };

  const handleDisclosureRequest = async () => {
    if (!justification.trim() || !caseId) return;
    setRequesting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/disclosure/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({ caseId, justification }),
      });
      if (res.ok) {
        setShowDisclosureConfirm(false);
        setModalOpen(false);
        setJustification("");
        toast({
          title: "Disclosure Request Submitted",
          description: "Request routed to Disclosure Authority for judicial verification.",
        });
        fetchCase(officerToken);
      } else {
        const err = await res.json();
        toast({
          title: "Request Failed",
          description: err.error || "Failed to submit disclosure request.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Disclosure request failed", err);
    } finally {
      setRequesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !caseId) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach(f => formData.append("files", f));
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${officerToken}` },
        body: formData,
      });
      if (res.ok) {
        toast({ title: "Evidence Uploaded", description: "Official report attached to case." });
        fetchCase(officerToken);
      }
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRequestClarification = async () => {
    if (!clarificationContent.trim() || !caseId) return;
    setSendingClarification(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}/clarification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({ content: clarificationContent }),
      });
      if (res.ok) {
        setClarificationContent("");
        setShowClarificationConfirm(false);
        toast({ title: "Clarification Dispatched", description: "Notification sent to citizen's secure desk." });
        fetchCase(officerToken);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingClarification(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1 min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!grievance) return null;

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
      <div className="mb-4">
        <Link href="/officer" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assigned Cases
        </Link>
      </div>

      <ProtectedBanner />

      {disclosure && (
        <div className="mb-6 p-5 bg-red-50 border-2 border-red-400 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-red-700 uppercase tracking-wider text-sm">
              Citizen Identity Disclosed (Court-Authorized)
            </h2>
          </div>
          <p className="text-red-800 text-xs mb-3">
            Real registered identity revealed under judicial authorization. This event has been permanently audit-logged.
          </p>
          <div className="bg-white border border-red-200 rounded-xl p-4 font-mono text-xs space-y-2">
            <p>
              <span className="font-semibold text-gray-700">Citizen Email:</span>{" "}
              <span className="text-base font-bold text-red-700">{disclosure.revealedEmail}</span>
            </p>
            {disclosure.courtOrderRef && (
              <p><span className="font-semibold text-gray-700">Court Order Ref:</span> {disclosure.courtOrderRef}</p>
            )}
            {disclosure.decidedAt && (
              <p>
                <span className="font-semibold text-gray-700">Approved At:</span>{" "}
                {new Date(disclosure.decidedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CPGRAMS 2-Phase Stepper */}
      <div className="mb-6 space-y-4">
        <CaseProgressStepper
          status={grievance.status}
          department={grievance.department}
          appealStatus={grievance.appealStatus}
        />
      </div>

      {/* Appellate Authority Review Card (Stage 10) */}
      {grievance.status === 'appealed' && (
        <div className="mb-8 p-6 bg-red-50/90 border-2 border-red-300 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-600 text-white rounded-xl">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-950 uppercase tracking-wider">
                  Nodal Appellate Authority (NAA) Appeal Review Desk
                </h3>
                <p className="text-xs text-red-800">
                  Stage 10: Citizen filed First Appeal against initial ground redressal.
                </p>
              </div>
            </div>
            <Badge className="bg-red-600 text-white text-xs font-mono">
              Action Required
            </Badge>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-200 text-xs space-y-4 mb-4">
            <div>
              <span className="font-bold text-gray-900 block mb-1">Complainant Appeal Grounds:</span>
              <p className="text-gray-800 italic bg-red-50/60 p-3 rounded-lg border border-red-100">&ldquo;{grievance.appealReason}&rdquo;</p>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900 block">Appellate Decision:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAppealDecision("fresh_action_ordered")}
                  className={`p-3 rounded-xl border text-left transition text-xs ${appealDecision === 'fresh_action_ordered' ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                  <span className="block font-bold text-indigo-700">1. Order Fresh Field Correction</span>
                  <span className="text-[11px] text-gray-500">Re-opens case for immediate on-site rectification.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppealDecision("upheld")}
                  className={`p-3 rounded-xl border text-left transition text-xs ${appealDecision === 'upheld' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                  <span className="block font-bold text-emerald-700">2. Uphold Ground Resolution</span>
                  <span className="text-[11px] text-gray-500">Confirms ATR resolution was legally adequate.</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Appellate Authority Order Remarks</label>
                <Textarea
                  value={appealOrderRemarks}
                  onChange={(e) => setAppealOrderRemarks(e.target.value)}
                  placeholder="Enter formal Appellate Authority order text..."
                  className="min-h-[70px] text-xs bg-gray-50"
                />
              </div>

              <Button
                onClick={() => setShowAppealDecisionConfirm(true)}
                disabled={decidingAppeal}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4 h-9"
              >
                Issue Formal Appellate Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Case Card */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8 rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] bg-gray-50/40 p-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-3xl font-bold text-[#5E6AD2]">
                {grievance.caseId}
              </span>
              {typeof grievance.votes === "number" && grievance.votes > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-bold text-orange-700">
                  {grievance.votes} Community Upvote{grievance.votes === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="bg-[#E5E7EB] text-[#111827] font-normal hover:bg-[#E5E7EB]">
                {grievance.category}
              </Badge>
              <span className="text-xs text-[#6B7280] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {new Date(grievance.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <Select value={statusInput} onValueChange={(value) => setStatusInput(value ?? "")}>
              <SelectTrigger className="w-full sm:w-[220px] bg-[#F9FAFB] border-[#E5E7EB] text-xs">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="received">1. Received / Registered</SelectItem>
                <SelectItem value="under_process">2. Under Process (Nodal)</SelectItem>
                <SelectItem value="forwarded">3. Forwarded to Subordinate</SelectItem>
                <SelectItem value="disposed">4. Disposed / Closed (ATR)</SelectItem>
                <SelectItem value="appealed">5. Appeal Under Review (NAA)</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                if (statusInput && statusInput !== grievance.status) {
                  if (statusInput === 'disposed' || statusInput === 'resolved') {
                    setShowAtrModal(true);
                  } else {
                    setShowStatusConfirm(true);
                  }
                }
              }} 
              disabled={updating || statusInput === grievance.status}
              className="bg-[#111827] text-white hover:bg-[#374151] text-xs h-9 px-4 shrink-0"
            >
              Update Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-[#111827] mb-2 uppercase tracking-wider">Citizen Grievance Description</h3>
            <p className="text-sm text-[#4B5563] whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
              {grievance.description}
            </p>
          </div>

          {/* Action Taken Report (ATR) - if already submitted */}
          {grievance.atrRemarks && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-emerald-950 uppercase tracking-wider block">Submitted Action Taken Report (ATR):</span>
              <p className="text-emerald-900 whitespace-pre-wrap leading-relaxed">{grievance.atrRemarks}</p>
            </div>
          )}
          
          {/* Documents & Case Evidence Timeline */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" /> Evidence & Investigation Documents ({documents.length})
              </h3>
              <div className="relative overflow-hidden inline-block">
                <Button variant="outline" size="sm" disabled={uploadingDoc} className="text-xs flex items-center gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                  <Upload className="w-3.5 h-3.5" /> Upload Investigation Report
                </Button>
                <input 
                  type="file" 
                  multiple 
                  className="absolute left-0 top-0 opacity-0 cursor-pointer w-full h-full" 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
            
            {documents.length > 0 ? (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div key={doc._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-200 transition shadow-2xs">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 bg-indigo-50 text-[#5E6AD2] rounded-xl shrink-0 mt-0.5">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 font-mono truncate">{doc.originalName || "Document"}</span>
                          <Badge className={doc.uploadedByRole === 'citizen' ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]" : "bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]"}>
                            {doc.uploadedByRole === 'citizen' ? "Citizen Evidence" : "Officer Report"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(doc.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadOfficerDoc(doc)}
                      disabled={downloadingDocId === doc._id}
                      className="text-xs text-[#5E6AD2] border-indigo-200 hover:bg-indigo-50 shrink-0 self-start sm:self-auto flex items-center gap-1.5 h-8 px-3"
                    >
                      {downloadingDocId === doc._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{downloadingDocId === doc._id ? "Downloading..." : "Download File"}</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
                No documents uploaded yet.
              </p>
            )}

            {/* External Web Evidence Links */}
            {(() => {
              const externalEvidenceLinks = (grievance.evidenceUrls || []).filter(
                (url) => !url.includes("/uploads/") && (url.startsWith("http://") || url.startsWith("https://"))
              );
              if (externalEvidenceLinks.length === 0) return null;
              return (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-indigo-600" /> Attached External Web Evidence ({externalEvidenceLinks.length})
                  </h4>
                  <div className="space-y-2">
                    {externalEvidenceLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-200/80 rounded-xl text-xs gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-mono text-indigo-900 truncate">{link}</span>
                        </div>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-medium transition shadow-2xs shrink-0"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
      
      {/* Clarification Section */}
      <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl">
        <h2 className="text-base font-bold text-[#111827] mb-1 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600" /> Request Clarification from Citizen
        </h2>
        <p className="text-xs text-gray-600 mb-3">If complaint details are incomplete, request additional information without revealing citizen identity.</p>
        
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <Textarea 
            value={clarificationContent} 
            onChange={e => setClarificationContent(e.target.value)} 
            placeholder="e.g. Please provide the exact pole number or landmark..." 
            className="resize-none bg-white min-h-[60px] text-xs"
          />
          <Button
            onClick={() => {
              if (clarificationContent.trim()) setShowClarificationConfirm(true);
            }}
            disabled={!clarificationContent.trim()}
            className="bg-[#111827] hover:bg-gray-800 text-white shrink-0 self-end sm:self-auto text-xs px-4"
          >
            Request Clarification
          </Button>
        </div>
        
        {reminders.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Timeline of Reminders & Responses</h3>
            {reminders.map(r => (
              <div key={r._id} className="p-3.5 border border-gray-200 rounded-xl bg-white text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center text-gray-500">
                  <span className="font-bold uppercase tracking-wider text-[#5E6AD2] bg-indigo-50 px-2 py-0.5 rounded-md">
                    {r.type.replace(/_/g, ' ')}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3 h-3" /> {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Masked Communication Thread</h2>
          <p className="text-xs text-[#6B7280]">Direct communication channel. Citizen real identity is masked into pairwise session token.</p>
        </div>
        
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm text-xs">
                Request Identity Disclosure
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-red-600 font-bold">Request Judicial Identity Disclosure</DialogTitle>
              <DialogDescription className="text-xs text-gray-600">
                This action is severely restricted. You must provide a valid High Court / Magistrate Order reference number.
                Every request is permanently recorded in the immutable audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Court Order Reference / Legal Justification</label>
                <Textarea 
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="E.g., High Court Order Ref: HC-2026-881 for formal evidentiary submission"
                  className="bg-[#F9FAFB] min-h-[90px] text-xs"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (justification.trim()) setShowDisclosureConfirm(true);
                }}
                disabled={!justification.trim()}
              >
                Submit for Judicial Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ChatThread caseId={grievance.caseId} role="officer" authToken={officerToken} />

      {/* Action Taken Report (ATR) Submission Modal */}
      <Dialog open={showAtrModal} onOpenChange={setShowAtrModal}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader className="gap-2">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl w-fit">
              <FileCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">
              Submit Action Taken Report (ATR) & Dispose Case
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Stage 7: Provide formal resolution details. This will be published in the CPGRAMS public disposal registry.
            </DialogDescription>
          </DialogHeader>
          <div className="my-3 space-y-2">
            <label className="text-xs font-semibold text-gray-700">Action Taken Report (ATR) Summary</label>
            <Textarea
              value={atrRemarksInput}
              onChange={(e) => setAtrRemarksInput(e.target.value)}
              placeholder="Detail on-site rectification, administrative action, and compliance measures taken..."
              className="min-h-[110px] bg-[#F9FAFB] text-xs"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAtrModal(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleStatusUpdate}
              disabled={!atrRemarksInput.trim() || updating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {updating ? "Submitting..." : "Submit ATR & Mark Disposed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
        onConfirm={handleStatusUpdate}
        loading={updating}
        title="Confirm Status Transition?"
        icon="info"
        confirmText="Confirm Status Update"
        description={
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-600">
              Are you sure you want to change the status of Case <strong className="text-indigo-600">{caseId}</strong> to:
            </p>
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-center font-bold text-sm text-[#5E6AD2] uppercase tracking-wide">
              {statusInput.replace('_', ' ')}
            </div>
            <p className="text-[11px] text-gray-500">This will update the citizen timeline and log an immutable audit event.</p>
          </div>
        }
      />

      {/* Appellate Decision Confirmation Modal */}
      <ConfirmModal
        isOpen={showAppealDecisionConfirm}
        onClose={() => setShowAppealDecisionConfirm(false)}
        onConfirm={handleAppealDecision}
        loading={decidingAppeal}
        title="Issue Formal Appellate Order?"
        icon="warning"
        variant="warning"
        confirmText="Confirm Appellate Order"
        description={
          <div className="space-y-2 pt-1 text-xs text-gray-600">
            <p>You are issuing an Appellate Authority order with decision: <strong className="text-indigo-700 uppercase">{appealDecision.replace(/_/g, ' ')}</strong>.</p>
            {appealOrderRemarks && (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg italic text-gray-800">
                &ldquo;{appealOrderRemarks}&rdquo;
              </div>
            )}
          </div>
        }
      />

      {/* Clarification Request Confirmation Modal */}
      <ConfirmModal
        isOpen={showClarificationConfirm}
        onClose={() => setShowClarificationConfirm(false)}
        onConfirm={handleRequestClarification}
        loading={sendingClarification}
        title="Send Clarification Request?"
        icon="info"
        confirmText="Dispatch Clarification"
        description={
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-600">The citizen will receive the following request on their secure desk:</p>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs italic text-gray-800">
              &ldquo;{clarificationContent}&rdquo;
            </div>
          </div>
        }
      />

      {/* Disclosure Request Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisclosureConfirm}
        onClose={() => setShowDisclosureConfirm(false)}
        onConfirm={handleDisclosureRequest}
        loading={requesting}
        title="Submit Legal Disclosure Request?"
        icon="danger"
        variant="destructive"
        confirmText="Confirm Legal Submission"
        description={
          <div className="space-y-2 pt-1">
            <p className="text-xs text-red-800 font-medium">
              Warning: Unauthorized identity disclosure requests violate citizen privacy regulations and are subject to departmental and legal audit.
            </p>
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-950 font-mono">
              <strong>Order Ref:</strong> {justification}
            </div>
          </div>
        }
      />
    </div>
  );
}
