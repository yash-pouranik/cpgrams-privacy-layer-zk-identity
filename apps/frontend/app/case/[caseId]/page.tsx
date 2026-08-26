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
import { Bell, MessageSquare, Star, Download, FileText, ArrowLeft } from "lucide-react";
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
  
  const [grievance, setGrievance] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  
  const [documents, setDocuments] = useState<Document[]>([]);
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
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Grievances
        </Link>
      </div>

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
              {grievance.department && (
                <span className="text-sm text-[#6B7280]">Dept: {grievance.department}</span>
              )}
              <span className="text-sm text-[#6B7280]">
                • {new Date(grievance.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <StatusBadge status={grievance.status} />
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-2 uppercase tracking-wider">Description</h3>
            <p className="text-[#6B7280] whitespace-pre-wrap leading-relaxed">
              {grievance.description}
            </p>
          </div>
          
          {documents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#111827] mb-2 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" /> Attached Evidence Documents ({documents.length})
              </h3>
              <div className="flex flex-col gap-2">
                {documents.map(doc => (
                  <div key={doc._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-sm font-mono text-gray-700">{doc.originalName || "Document"}</span>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/grievance/${caseId}/documents/${doc._id}/download`}
                      className="text-[#5E6AD2] hover:text-[#4F5BC0] text-xs font-semibold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Reminders & Clarifications */}
      {reminders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" /> Reminders & Clarifications
          </h2>
          <div className="space-y-4">
            {reminders.map(r => (
              <div key={r._id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col gap-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="font-bold uppercase text-[#5E6AD2]">{r.type.replace(/_/g, ' ')}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-800 text-sm">{r.content}</p>
                
                {r.type === 'clarification_request' && (
                  <div className="mt-2 flex gap-2">
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
          <h2 className="text-base font-bold text-[#111827] mb-1">Send Status Reminder to Department</h2>
          <p className="text-xs text-gray-600 mb-3">If redressal is taking longer than expected, submit a reminder ping to the assigned nodal officer.</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Textarea 
              value={reminderContent} 
              onChange={e => setReminderContent(e.target.value)} 
              placeholder="e.g. Please expedite action on this pothole repair..." 
              className="resize-none bg-white min-h-[60px]"
            />
            <Button
              onClick={() => {
                if (reminderContent.trim()) setShowReminderConfirm(true);
              }}
              disabled={!reminderContent.trim()}
              className="bg-[#111827] hover:bg-gray-800 text-white shrink-0 self-end sm:self-auto"
            >
              Send Reminder
            </Button>
          </div>
        </div>
      )}

      {/* Redressal Feedback Section */}
      {grievance.status === 'resolved' && (
        <div className="mb-8 p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
          <h2 className="text-lg font-bold text-emerald-950 mb-1 flex items-center gap-2">
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
                  className="bg-[#F9FAFB] min-h-[70px]"
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

      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
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
              className="min-h-[100px] bg-[#F9FAFB]"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowReplyModal(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleReplyClarification}
              disabled={!replyContent.trim() || sendingReply}
              className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white"
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
