"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ChatThread } from "@/components/ChatThread";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, MessageSquare, Star, Download, FileText, ArrowLeft, Clock, ShieldCheck, FileCheck, Loader2 } from "lucide-react";
import Link from "next/link";

interface CaseDetail {
  caseId: string;
  category: string;
  status: string;
  department: string | null;
  description: string;
  createdAt: string;
  feedbackSubmitted?: boolean;
  feedback?: { rating: number; comment: string; createdAt: string };
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

export default function CitizenCaseDetail() {
  const router = useRouter();
  const routeParams = useParams();
  const caseId = (routeParams?.caseId as string) || "";
  const { toast } = useToast();
  
  const [grievance, setGrievance] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  const [reminderContent, setReminderContent] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  
  const [replyContent, setReplyContent] = useState("");
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showFeedbackConfirm, setShowFeedbackConfirm] = useState(false);

  const fetchCaseData = useCallback(async (t: string) => {
    if (!caseId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      const res = await fetch(`${apiUrl}/grievance/${caseId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setGrievance(await res.json());
      } else {
        router.push("/dashboard");
        return;
      }
      
      const docRes = await fetch(`${apiUrl}/grievance/${caseId}/documents`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (docRes.ok) {
        setDocuments(await docRes.json());
      }
      
      const remRes = await fetch(`${apiUrl}/grievance/${caseId}/reminders`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (remRes.ok) {
        setReminders(await remRes.json());
      }
      
    } catch (err) {
      console.error("Failed to fetch case details:", err);
    } finally {
      setLoading(false);
    }
  }, [caseId, router]);

  useEffect(() => {
    const t = sessionStorage.getItem("token");
    if (!t) {
      router.push("/");
      return;
    }
    setToken(t);
    fetchCaseData(t);
  }, [fetchCaseData, router]);

  const handleDownloadDocument = async (doc: Document) => {
    setDownloadingDocId(doc._id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${caseId}/documents/${doc._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const handleSendReminder = async () => {
    if (!reminderContent.trim() || !caseId) return;
    setSendingReminder(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${caseId}/reminder`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ type: 'reminder', content: reminderContent }),
      });
      if (res.ok) {
        setReminderContent("");
        setShowReminderConfirm(false);
        toast({ title: "Reminder Dispatched", description: "Reminder logged in case audit trail." });
        fetchCaseData(token);
      }
    } finally {
      setSendingReminder(false);
    }
  };

  const handleReplyClarification = async () => {
    if (!replyContent.trim() || !caseId) return;
    setSendingReply(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${caseId}/reminder`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ type: 'clarification_response', content: replyContent }),
      });
      if (res.ok) {
        setReplyContent("");
        setShowReplyModal(false);
        toast({ title: "Clarification Sent", description: "Reply submitted to assigned officer." });
        fetchCaseData(token);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!caseId) return;
    setSubmittingFeedback(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${caseId}/feedback`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ rating, comment: feedbackComment }),
      });
      if (res.ok) {
        setShowFeedbackConfirm(false);
        toast({ title: "Feedback Recorded", description: "Thank you for rating the grievance redressal." });
        fetchCaseData(token);
      }
    } finally {
      setSubmittingFeedback(false);
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
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Grievances
        </Link>
      </div>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8 rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] bg-gray-50/40 p-6">
          <div>
            <div className="font-mono text-3xl font-bold text-[#5E6AD2] mb-2">
              {grievance.caseId}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-[#E5E7EB] text-[#111827] font-normal hover:bg-[#E5E7EB]">
                {grievance.category}
              </Badge>
              {grievance.department && (
                <span className="text-xs text-[#6B7280]">Dept: <strong>{grievance.department}</strong></span>
              )}
              <span className="text-xs text-[#6B7280] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {new Date(grievance.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <StatusBadge status={grievance.status} />
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-[#111827] mb-2 uppercase tracking-wider">Complaint Description</h3>
            <p className="text-sm text-[#4B5563] whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
              {grievance.description}
            </p>
          </div>
          
          {/* Documents & Case Evidence Timeline */}
          <div>
            <h3 className="text-xs font-bold text-[#111827] mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" /> Attached Evidence & Investigation Documents ({documents.length})
            </h3>
            
            {documents.length > 0 ? (
              <div className="space-y-2.5">
                {documents.map((doc, idx) => (
                  <div key={doc._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-200 transition shadow-2xs">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 bg-indigo-50 text-[#5E6AD2] rounded-xl shrink-0 mt-0.5">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 font-mono truncate">{doc.originalName || "Evidence Document"}</span>
                          <Badge className={doc.uploadedByRole === 'citizen' ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]" : "bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]"}>
                            {doc.uploadedByRole === 'citizen' ? "Citizen Upload" : "Official Report"}
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
                      onClick={() => handleDownloadDocument(doc)}
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
                No documents attached to this grievance.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Reminders & Clarifications */}
      {reminders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#111827] mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" /> Reminders & Clarifications Timeline
          </h2>
          <div className="space-y-3">
            {reminders.map(r => (
              <div key={r._id} className="p-4 border border-gray-200 rounded-2xl bg-white shadow-2xs flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="font-bold uppercase tracking-wider text-[#5E6AD2] bg-indigo-50 px-2 py-0.5 rounded-md">
                    {r.type.replace(/_/g, ' ')}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">{r.content}</p>
                
                {r.type === 'clarification_request' && (
                  <div className="mt-1 pt-2 border-t border-gray-100 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReplyModal(true)}
                      className="text-xs text-[#5E6AD2] border-indigo-200 hover:bg-indigo-50"
                    >
                      Reply to Clarification
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Reminder Form */}
      {grievance.status !== 'resolved' && (
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl">
          <h2 className="text-sm font-bold text-[#111827] mb-1">Send Status Reminder to Department</h2>
          <p className="text-xs text-gray-600 mb-3">If redressal is taking longer than expected, submit an official reminder ping to the assigned nodal officer.</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Textarea 
              value={reminderContent} 
              onChange={e => setReminderContent(e.target.value)} 
              placeholder="e.g. Please expedite action on this pending grievance..." 
              className="resize-none bg-white min-h-[60px] text-xs"
            />
            <Button
              onClick={() => {
                if (reminderContent.trim()) setShowReminderConfirm(true);
              }}
              disabled={!reminderContent.trim()}
              className="bg-[#111827] hover:bg-gray-800 text-white shrink-0 self-end sm:self-auto text-xs px-5"
            >
              Send Reminder
            </Button>
          </div>
        </div>
      )}

      {/* Redressal Feedback Section */}
      {grievance.status === 'resolved' && (
        <div className="mb-8 p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
          <h2 className="text-base font-bold text-emerald-950 mb-1 flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-600 fill-emerald-600" /> Case Redressal Feedback
          </h2>
          
          {grievance.feedbackSubmitted && grievance.feedback ? (
            <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-100 space-y-1">
              <h3 className="font-semibold text-emerald-950 text-sm">Your Submitted Review</h3>
              <p className="text-sm text-emerald-900">Rating: <strong>{grievance.feedback.rating} / 5 Stars</strong></p>
              {grievance.feedback.comment && (
                <p className="text-gray-700 text-sm italic mt-1">&ldquo;{grievance.feedback.comment}&rdquo;</p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4 bg-white p-5 rounded-xl border border-emerald-100">
              <h3 className="font-semibold text-gray-900 text-sm">How satisfied are you with the resolution?</h3>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-700">Rating:</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${rating === v ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                    >
                      {v} ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Comments (Optional)</label>
                <Textarea
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  placeholder="Share feedback on resolution speed, staff cooperation, or quality..."
                  className="bg-[#F9FAFB] min-h-[70px] text-xs"
                />
              </div>
              <Button
                onClick={() => setShowFeedbackConfirm(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium px-5"
              >
                Submit Feedback
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#5E6AD2]" /> Secure Masked Communication
        </h2>
        <p className="text-xs text-[#6B7280]">Direct communication with the assigned department officer. Your phone, email, and Aadhaar remain strictly hidden.</p>
      </div>

      <ChatThread caseId={grievance.caseId} role="citizen" authToken={token} />

      {/* Reminder Confirmation Dialog */}
      <ConfirmModal
        isOpen={showReminderConfirm}
        onClose={() => setShowReminderConfirm(false)}
        onConfirm={handleSendReminder}
        loading={sendingReminder}
        title="Send Grievance Reminder?"
        icon="info"
        confirmText="Confirm & Send"
        description={
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-600">This will post an official reminder to the department audit trail for Case <strong className="text-indigo-600">{caseId}</strong>:</p>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 italic">
              &ldquo;{reminderContent}&rdquo;
            </div>
          </div>
        }
      />

      {/* Reply to Clarification Dialog */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Reply to Officer Clarification</DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Provide additional details requested by the officer. Your identity remains protected.
            </DialogDescription>
          </DialogHeader>
          <div className="my-3">
            <Textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Type your clarification reply..."
              className="min-h-[100px] bg-[#F9FAFB] text-xs"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowReplyModal(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleReplyClarification}
              disabled={!replyContent.trim() || sendingReply}
              className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs"
            >
              {sendingReply ? "Sending..." : "Submit Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Confirmation Dialog */}
      <ConfirmModal
        isOpen={showFeedbackConfirm}
        onClose={() => setShowFeedbackConfirm(false)}
        onConfirm={handleSubmitFeedback}
        loading={submittingFeedback}
        title="Submit Resolution Feedback?"
        icon="success"
        variant="success"
        confirmText="Confirm & Submit Rating"
        description={
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-600">You are submitting a satisfaction rating of <strong className="text-emerald-700">{rating} / 5 Stars</strong> for this redressed grievance. Once submitted, feedback is recorded permanently in the department quality records.</p>
          </div>
        }
      />
    </div>
  );
}
