"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (officerId) {
      headers["X-Officer-Id"] = officerId;
    }
    return headers;
  };

  const fetchMessages = async () => {
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
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/chat/${caseId}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent("");
        await fetchMessages();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#6B7280]">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-[500px] border border-[#E5E7EB] rounded-lg bg-[#FFFFFF] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-[#6B7280] py-8">No messages yet. Send a message to start.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === role;
            const displayName = isMe ? "You" : msg.senderRole === "citizen" ? "Citizen" : "Officer";
            
            return (
              <div key={msg._id} className={`flex flex-col max-w-[80%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                <div className="text-xs text-[#6B7280] mb-1 px-1">
                  {displayName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`p-3 rounded-lg ${isMe ? "bg-[#5E6AD2] text-white" : "bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB]"}`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      
      <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[44px] resize-none bg-white border-[#E5E7EB]"
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
          className="bg-[#5E6AD2] hover:bg-[#828FFF] text-white h-auto px-6"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
