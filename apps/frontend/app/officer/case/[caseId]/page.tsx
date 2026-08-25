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

  const [grievance, setGrievance] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusInput, setStatusInput] = useState("");
  const [updating, setUpdating] = useState(false);
  const [justification, setJustification] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [clarificationContent, setClarificationContent] = useState("");
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
        alert("Status updated successfully.");
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
        setModalOpen(false);
        setJustification("");
        alert("Request submitted. Pending court authorization. The revealed identity will appear here once the Disclosure Authority approves.");
        // Refresh so that if this request is already approved, the identity shows.
        fetchCase(officerToken);
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Failed to request disclosure"));
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
        fetchCase(officerToken);
      }
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRequestClarification = async () => {
    if (!clarificationContent.trim() || !caseId) return;
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
        fetchCase(officerToken);
      }
    } catch (err) {
      console.error(err);
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
      <ProtectedBanner />

      {disclosure && (
        <div className="mb-6 p-5 bg-red-50 border-2 border-red-400 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl"></span>
            <h2 className="font-bold text-red-700 uppercase tracking-wider text-lg">
              Identity Disclosed (Court-Authorized)
            </h2>
          </div>
          <p className="text-red-800 text-sm mb-3">
            Identity revealed upon court order. This disclosure has been audit-logged.
          </p>
          <div className="bg-white border border-red-200 rounded-md p-4 font-mono text-sm space-y-2">
            <p>
              <span className="font-semibold">Citizen Email:</span>{" "}
              <span className="text-lg font-bold text-red-700">{disclosure.revealedEmail}</span>
            </p>
            {disclosure.courtOrderRef && (
              <p><span className="font-semibold">Court Order Ref:</span> {disclosure.courtOrderRef}</p>
            )}
            {disclosure.decidedAt && (
              <p>
                <span className="font-semibold">Approved At:</span>{" "}
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
              onClick={handleStatusUpdate} 
              disabled={updating || statusInput === grievance.status}
              className="bg-[#111827] text-white hover:bg-[#374151]"
            >
              {updating ? "Updating..." : "Update Status"}
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
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wider">Documents</h3>
              <div className="relative overflow-hidden inline-block">
                <Button variant="outline" size="sm" disabled={uploadingDoc}>Upload File</Button>
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
                  <div key={doc._id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                    <span className="text-sm font-mono text-gray-700">{doc.originalName || "Document"}</span>
                    <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/officer/case/${caseId}/documents/${doc._id}/download`} className="text-blue-600 hover:underline text-sm font-medium" target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No documents uploaded.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#111827] mb-4">Clarifications & Reminders</h2>
        
        <div className="flex gap-2 mb-4">
          <Textarea 
            value={clarificationContent} 
            onChange={e => setClarificationContent(e.target.value)} 
            placeholder="Request clarification from the citizen..." 
            className="resize-none bg-[#F9FAFB]"
          />
          <Button onClick={handleRequestClarification} className="bg-[#111827] text-white">Request</Button>
        </div>
        
        {reminders.length > 0 && (
          <div className="space-y-4">
            {reminders.map(r => (
              <div key={r._id} className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="font-bold uppercase text-[#5E6AD2]">{r.type.replace(/_/g, ' ')}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-800 text-sm">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Secure Communication</h2>
          <p className="text-sm text-[#6B7280]">Chat with the citizen securely.</p>
        </div>
        
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm">
                Request Identity Disclosure
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Request Identity Disclosure</DialogTitle>
              <DialogDescription>
                This action is severely restricted. You must provide a valid legal/court justification.
                Every request is logged and must be approved by the Disclosure Authority.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Justification / Court Order Number</label>
                <Textarea 
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="E.g., Court Order Ref: HC-2026-441"
                  className="bg-[#F9FAFB]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDisclosureRequest} disabled={requesting || !justification.trim()}>
                {requesting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ChatThread caseId={grievance.caseId} role="officer" authToken={officerToken} />
    </div>
  );
}
