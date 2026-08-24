"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AUTOSAVE_KEY = "cpgrams_draft_desc";

export default function NewGrievancePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<{ name: string; parentCode: string | null }[]>([]);
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Fetch categories
  useEffect(() => {
    fetch(`${apiUrl}/master/categories`)
      .then(r => r.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Failed to load categories:", err));
  }, [apiUrl]);

  // Load draft
  useEffect(() => {
    const draft = localStorage.getItem(AUTOSAVE_KEY);
    if (draft) setDescription(draft);
  }, []);

  // Autosave
  useEffect(() => {
    const interval = setInterval(() => {
      if (description.length > 0) {
        localStorage.setItem(AUTOSAVE_KEY, description);
      }
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || description.length < 50) {
      toast({
        title: "Validation Error",
        description: "Please select a category and provide at least 50 characters of description.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/grievance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          description,
          evidenceUrls: evidenceUrl ? evidenceUrl.split(",").map(u => u.trim()).filter(u => u) : [],
        }),
      });

      if (!res.ok) throw new Error("Failed to file grievance");

      const data = await res.json();
      
      // Upload files if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append("files", f));
        
        await fetch(`${apiUrl}/grievance/${data.caseId}/documents`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }

      localStorage.removeItem(AUTOSAVE_KEY);
      
      alert(`Save this Registration Password: ${data.password}\n\nYou can use it to check status without logging in.`);
      
      toast({
        title: "Grievance Filed Successfully",
        description: `Case ID: ${data.caseId}`,
      });
      
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-12 flex-1">
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-2xl text-[#111827]">File New Grievance</CardTitle>
          <CardDescription className="text-[#6B7280] flex items-center gap-2 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#27a644" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span className="text-[#27a644] font-medium">Your identity will be protected. The officer will only see your Case ID.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Category</label>
              <Select value={category} onValueChange={(val) => setCategory(val || "")}>
                <SelectTrigger className="w-full bg-[#F9FAFB] border-[#E5E7EB]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.parentCode === null).map((cat, idx) => (
                    <SelectItem key={idx} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[#111827]">Description</label>
                <span className="text-xs text-[#6B7280]">
                  {description.length} / 50 min chars (Auto-saves)
                </span>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                className="min-h-[150px] bg-[#F9FAFB] border-[#E5E7EB] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Evidence URLs (Optional)</label>
              <Textarea
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://example.com/image.jpg, https://example.com/doc.pdf"
                className="min-h-[60px] bg-[#F9FAFB] border-[#E5E7EB]"
              />
              <p className="text-xs text-[#6B7280]">Separate multiple URLs with commas.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Attachments (Optional)</label>
              <input 
                type="file" 
                multiple 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="file-input file-input-bordered w-full bg-[#F9FAFB]" 
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={loading || description.length < 50 || !category}
                className="bg-[#5E6AD2] hover:bg-[#828FFF] text-white px-8"
              >
                {loading ? "Filing..." : "Submit Grievance"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
