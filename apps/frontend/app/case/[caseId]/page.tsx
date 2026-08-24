"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ChatThread } from "@/components/ChatThread";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  filename: string;
  createdAt: string;
}

interface Reminder {
  _id: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function CitizenCaseDetail({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  const [grievance, setGrievance] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  const [reminderContent, setReminderContent] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchCaseData = async () => {
    const t = sessionStorage.getItem("token");
    if (!t) {
      router.push("/");
      return;
    }
    setToken(t);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      const res = await fetch(`${apiUrl}/grievance/${params.caseId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setGrievance(await res.json());
      else { router.push("/dashboard"); return; }
      
      const docRes = await fetch(`${apiUrl}/grievance/${params.caseId}/documents`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (docRes.ok) setDocuments(await docRes.json());
      
      const remRes = await fetch(`${apiUrl}/grievance/${params.caseId}/reminders`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (remRes.ok) setReminders(await remRes.json());
      
    } catch (err) {
      console.error("Failed to fetch case details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseData();
  }, [params.caseId, router]);

  const handleSendReminder = async () => {
    if (!reminderContent.trim()) return;
    setSendingReminder(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${params.caseId}/reminder`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ type: 'reminder', content: reminderContent }),
      });
      if (res.ok) {
        setReminderContent("");
        fetchCaseData();
      }
    } finally {
      setSendingReminder(false);
    }
  };

  const handleReplyClarification = async (content: string) => {
    if (!content.trim()) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${params.caseId}/reminder`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ type: 'clarification_reply', content }),
      });
      if (res.ok) fetchCaseData();
    } catch(err) {
      console.error(err);
    }
  };

  const handleSubmitFeedback = async () => {
    setSubmittingFeedback(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/grievance/${params.caseId}/feedback`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ rating, comment: feedbackComment }),
      });
      if (res.ok) fetchCaseData();
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!grievance) return null;

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
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
              <h3 className="text-sm font-semibold text-[#111827] mb-2 uppercase tracking-wider">Documents</h3>
              <div className="flex flex-col gap-2">
                {documents.map(doc => (
                  <div key={doc._id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                    <span className="text-sm font-mono text-gray-700">{doc.filename}</span>
                    <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/grievance/${params.caseId}/documents/${doc._id}/download`} className="text-blue-600 hover:underline text-sm" target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {reminders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-4">Reminders & Clarifications</h2>
          <div className="space-y-4">
            {reminders.map(r => (
              <div key={r._id} className="p-4 border rounded bg-white shadow-sm flex flex-col gap-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="font-bold uppercase">{r.type.replace('_', ' ')}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-800 text-sm">{r.content}</p>
                
                {r.type === 'clarification_request' && (
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const reply = prompt("Enter your reply to this clarification:");
                      if (reply) handleReplyClarification(reply);
                    }}>Reply</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {grievance.status !== 'resolved' && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-2">Send Reminder</h2>
          <div className="flex gap-2">
            <Textarea 
              value={reminderContent} 
              onChange={e => setReminderContent(e.target.value)} 
              placeholder="Reminder message..." 
              className="resize-none"
            />
            <Button onClick={handleSendReminder} disabled={sendingReminder}>Send</Button>
          </div>
        </div>
      )}

      {grievance.status === 'resolved' && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-bold text-green-900 mb-2">Case Resolved</h2>
          
          {grievance.feedbackSubmitted && grievance.feedback ? (
            <div className="mt-4">
              <h3 className="font-bold">Your Feedback</h3>
              <p>Rating: {grievance.feedback.rating} / 5</p>
              <p className="text-gray-700 italic">"{grievance.feedback.comment}"</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <h3 className="font-bold">Submit Feedback</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
                <div className="rating">
                  {[1,2,3,4,5].map(v => (
                    <input key={v} type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" checked={rating === v} onChange={() => setRating(v)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comment</label>
                <Textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="How was your experience?" />
              </div>
              <Button onClick={handleSubmitFeedback} disabled={submittingFeedback} className="bg-green-600 text-white hover:bg-green-700">
                Submit Feedback
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#111827]">Secure Communication</h2>
        <p className="text-sm text-[#6B7280]">The officer is handling your case. Messages are masked to protect your identity.</p>
      </div>

      <ChatThread caseId={grievance.caseId} role="citizen" authToken={token} />
    </div>
  );
}
