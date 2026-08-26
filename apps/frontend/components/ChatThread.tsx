"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Send, ShieldCheck, User } from "lucide-react";

interface Message {
  _id: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

interface ChatThreadProps {
  caseId: string;
  role: "citizen" | "officer";
  authToken?: string;
  officerId?: string;
}

export function ChatThread({ caseId, role, authToken, officerId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (officerId) {
      headers["X-Officer-Id"] = officerId;
    }
    return headers;
  }, [authToken, officerId]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const fetchMessages = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/chat/${caseId}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [caseId, getHeaders]);

  // Initial load only - NO auto-polling interval to prevent annoying page scroll jumps
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/chat/${caseId}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        setContent("");
        await fetchMessages();
        // Smoothly scroll only the chat internal box to bottom
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-gray-500 border border-gray-200 rounded-2xl bg-white">
        Loading masked communication thread...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[460px] border border-[#E5E7EB] rounded-2xl bg-[#FFFFFF] shadow-sm overflow-hidden">
      {/* Header with Manual Refresh */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-gray-700">Case-Scoped Masked Channel</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchMessages(true)}
          disabled={refreshing}
          className="h-7 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2.5 rounded-lg"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </div>

      {/* Messages Scrollable Container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-xs py-8">
            <ShieldCheck className="w-8 h-8 text-gray-300 mb-2" />
            <p className="font-medium text-gray-600">No messages in thread yet.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Send a message below to communicate securely without identity exposure.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === role;
            const displayName = isMe ? "You" : msg.senderRole === "citizen" ? "Citizen" : "Assigned Officer";
            
            return (
              <div key={msg._id} className={`flex flex-col max-w-[80%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                <div className="text-[10px] text-gray-400 mb-1 px-1 flex items-center gap-1 font-mono">
                  <span>{displayName}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${isMe ? "bg-[#5E6AD2] text-white rounded-br-xs shadow-xs" : "bg-[#F3F4F6] text-[#111827] border border-gray-200/80 rounded-bl-xs"}`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type message here (identity remains masked)..."
          className="min-h-[42px] max-h-[80px] text-xs resize-none bg-white border-[#E5E7EB] rounded-xl py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button 
          onClick={handleSend} 
          disabled={sending || !content.trim()} 
          className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white h-10 px-4 rounded-xl text-xs flex items-center gap-1 shadow-sm shrink-0"
        >
          <span>{sending ? "Sending..." : "Send"}</span>
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
