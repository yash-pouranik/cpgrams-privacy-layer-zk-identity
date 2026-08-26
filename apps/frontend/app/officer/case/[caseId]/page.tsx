"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedBanner } from "@/components/ProtectedBanner";
import { ChatThread } from "@/components/ChatThread";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, HelpCircle, ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface CaseDetail {
  caseId: string;
  category: string;
  status: string;
  department: string | null;
  description: string;
  createdAt: string;
}

interface Document {
  _id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
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

  const [justification, setJustification] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDisclosureConfirm, setShowDisclosureConfirm] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>([]);
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

      // Court-authorized disclosure status (reveals identity only if approved).
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

  const handleStatusUpdate = async () => {
    if (!statusInput || statusInput === grievance?.status || !caseId) return;
    setUpdating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/case/${caseId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({ status: statusInput }),
      });
      if (res.ok) {
        await fetchCase(officerToken);
        setShowStatusConfirm(false);
        toast({
          title: "Status Updated",
          description: `Case ${caseId} status updated to ${statusInput.replace('_', ' ')}.`,
        });
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdating(false);
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

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
          <div>
            <div className="font-mono text-3xl font-bold text-[#5E6AD2] mb-2">
              {grievance.caseId}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-[#E5E7EB] text-[#111827] font-normal hover:bg-[#E5E7EB]">
                {grievance.category}
              </Badge>
              <span className="text-sm text-[#6B7280]">
                • {new Date(grievance.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusInput} onValueChange={(value) => setStatusInput(value ?? "")}>
              <SelectTrigger className="w-[140px] bg-[#F9FAFB] border-[#E5E7EB]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                if (statusInput && statusInput !== grievance.status) {
                  setShowStatusConfirm(true);
                }
              }} 
              disabled={updating || statusInput === grievance.status}
              className="bg-[#111827] text-white hover:bg-[#374151] text-xs h-9 px-4"
            >
              Update Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-2 uppercase tracking-wider">Description</h3>
            <p className="text-[#6B7280] whitespace-pre-wrap leading-relaxed">
              {grievance.description}
            </p>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wider">Evidence & Reports</h3>
              <div className="relative overflow-hidden inline-block">
                <Button variant="outline" size="sm" disabled={uploadingDoc} className="text-xs flex items-center gap-1">
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
              <div className="flex flex-col gap-2">
                {documents.map(doc => (
                  <div key={doc._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-sm font-mono text-gray-700">{doc.originalName || "Document"}</span>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/officer/case/${caseId}/documents/${doc._id}/download`}
                      className="text-[#5E6AD2] hover:text-[#4F5BC0] text-xs font-semibold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No documents uploaded yet.</p>
            )}
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
            className="resize-none bg-white min-h-[60px]"
          />
          <Button
            onClick={() => {
              if (clarificationContent.trim()) setShowClarificationConfirm(true);
            }}
            disabled={!clarificationContent.trim()}
            className="bg-[#111827] hover:bg-gray-800 text-white shrink-0 self-end sm:self-auto text-xs"
          >
            Request Clarification
          </Button>
        </div>
        
        {reminders.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Timeline of Reminders & Responses</h3>
            {reminders.map(r => (
              <div key={r._id} className="p-3 border border-gray-200 rounded-xl bg-white text-xs space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span className="font-bold uppercase text-[#5E6AD2]">{r.type.replace(/_/g, ' ')}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-800">{r.content}</p>
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
                  className="bg-[#F9FAFB] min-h-[90px]"
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
              Are you sure you want to change the status of Case <strong className="text-indigo-600">{caseId}</strong> from <span className="capitalize font-semibold">{grievance.status.replace('_', ' ')}</span> to:
            </p>
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-center font-bold text-sm text-[#5E6AD2] uppercase tracking-wide">
              {statusInput.replace('_', ' ')}
            </div>
            <p className="text-[11px] text-gray-500">This will update the citizen timeline and log an immutable audit event.</p>
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
              ⚠️ Warning: Unauthorized identity disclosure requests violate citizen privacy regulations and are subject to departmental and legal audit.
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
