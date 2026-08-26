"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AUTOSAVE_KEY = "cpgrams_draft_desc";

// Min description length before we start querying duplicate suggestions.
const SUGGEST_MIN = 40;

// Allowed file types: images and PDFs only.
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

type StoredFile = {
  file: File;
  previewUrl: string; // object URL for image/PDF thumbnail preview
  size: number;
};

export default function NewGrievancePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<{ name: string; parentCode: string | null }[]>([]);
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // ---- Duplicate-detection suggestions (StackOverflow-style) ----
  const [suggestions, setSuggestions] = useState<
    { caseId: string; excerpt: string; votes: number; status: string }[]
  >([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [votingCaseId, setVotingCaseId] = useState<string | null>(null);
  const [suggestedVoted, setSuggestedVoted] = useState(false);
  const [ownDuplicate, setOwnDuplicate] = useState<{
    caseId: string;
    excerpt: string;
    votes: number;
    status: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch categories
  useEffect(() => {
    fetch(`${apiUrl}/master/categories`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error("Failed to load categories:", err));
  }, [apiUrl]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const accepted = selected.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const tooLarge = selected.filter((f) => f.size > MAX_FILE_SIZE);

    if (tooLarge.length > 0) {
      toast({
        title: "File Too Large",
        description: `${tooLarge.map((f) => f.name).join(", ")} exceeds the 5MB limit and was skipped.`,
        variant: "destructive",
      });
    }
    if (accepted.length !== selected.length) {
      toast({
        title: "Unsupported File Type",
        description: "Only image or PDF files can be attached.",
        variant: "destructive",
      });
    }

    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        size: file.size,
      })),
    ]);

    // Reset input so the same file can be selected again after removal.
    e.target.value = "";
  };

  // Revoke remaining object URLs on unmount to avoid memory leaks.
  useEffect(() => {
    const current = files;
    return () => {
      current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Debounced duplicate-detection suggestions.
  // Fires ~600ms after the user stops typing, so it's not spamming the API
  // while they write. Shows only when category + a substantial draft exist.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = description.trim();
    if (!category || trimmed.length < SUGGEST_MIN) {
      setSuggestions([]);
      setOwnDuplicate(null);
      return;
    }
    const token = sessionStorage.getItem("token");
    if (!token) return;

    debounceRef.current = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const res = await fetch(
          `${apiUrl}/grievance/suggestions?category=${encodeURIComponent(category)}&q=${encodeURIComponent(trimmed)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setOwnDuplicate(data.ownDuplicate || null);
      } catch (err) {
        console.error("Failed to fetch duplicate suggestions:", err);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, category, apiUrl]);

  // Register a vote on an existing issue instead of filing a duplicate.
  const handleVote = async (caseId: string) => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    setVotingCaseId(caseId);
    try {
      const res = await fetch(`${apiUrl}/grievance/${caseId}/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Vote not recorded",
          description: data.error || "Could not vote on this issue.",
          variant: "destructive",
        });
        return;
      }
      setSuggestedVoted(true);
      localStorage.removeItem(AUTOSAVE_KEY);
      // Surface the tracking info so this voter can follow the issue.
      const trackingPwd = data.trackingPassword;
      if (trackingPwd) {
        toast({
          title: `Vote recorded ✔ ${data.votes} confirmed`,
          description: `Case ${data.trackingCaseId || data.caseId} is now tracked.\n\nTracking Password: ${trackingPwd}\nUse the public status tracker to follow it.`,
        });
        // Give a moment for the toast to be seen, then go to the status tracker.
        setTimeout(() => router.push(`/status?caseId=${encodeURIComponent(data.caseId)}&password=${encodeURIComponent(trackingPwd)}`), 1800);
      } else {
        toast({
          title: "Vote recorded ✔",
          description: `This issue now has ${data.votes} vote${data.votes === 1 ? "" : "s"} — it will be escalated faster.`,
        });
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setVotingCaseId(null);
    }
  };

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
      // Build multipart form data.
      const formData = new FormData();
      formData.append("category", category);
      formData.append("description", description);

      // External link-based evidence as a JSON array string.
      const externalUrls = evidenceUrl
        ? evidenceUrl.split(",").map((u) => u.trim()).filter((u) => u)
        : [];
      formData.append("urls", JSON.stringify(externalUrls));

      // Attached files (images/PDFs).
      files.forEach((f) => formData.append("files", f.file, f.file.name));

      const res = await fetch(`${apiUrl}/grievance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to file grievance");
      }

      // Clean up object URL previews since the page is about to navigate away.
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));

      const data = await res.json();
      localStorage.removeItem(AUTOSAVE_KEY);
      
      const pwd = data.registrationPassword || data.password;
      if (pwd) {
        alert(`Save this Registration Password: ${pwd}\n\nYou can use it to check status on the public portal without logging in.`);
      }
      
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
              {suggestionsLoading && (
                <p className="text-xs text-[#6B7280] flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-[#5E6AD2] border-t-transparent animate-spin" />
                  Checking for similar reported issues…
                </p>
              )}
              {!suggestionsLoading && ownDuplicate && !suggestedVoted && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-800">
                    ✔ You already reported this complaint
                  </p>
                  <p className="text-sm text-[#6B7280] line-clamp-2">
                    {ownDuplicate.caseId} — {ownDuplicate.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/case/${ownDuplicate.caseId}`)}
                      className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      View your case &rarr;
                    </Button>
                    <p className="text-xs text-amber-700 self-center">
                      No need to file again — track progress on your existing case.
                    </p>
                  </div>
                </div>
              )}
              {!suggestionsLoading && suggestions.length > 0 && !suggestedVoted && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#5E6AD2]">🔍 Similar issues were already reported</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      You might be facing a known problem. Voting helps escalate it faster than re-filing.
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {suggestions.map((s) => (
                      <li key={s.caseId} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#5E6AD2]">
                            {s.caseId} · {s.votes} citizen{s.votes === 1 ? "" : "s"} already confirmed
                          </p>
                          <p className="text-sm text-[#111827] line-clamp-2">{s.excerpt}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleVote(s.caseId)}
                          disabled={votingCaseId === s.caseId}
                          className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs shrink-0"
                        >
                          {votingCaseId === s.caseId ? "Recording…" : "This is the same — Vote"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Evidence & Attachments (Optional)</label>

              <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-4 text-center">
                <input
                  type="file"
                  id="evidence-files"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  multiple
                  onChange={handleFiles}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.91l.47 5.77z"/><path d="m2.59 17.12 2.9-.41"/><path d="M21.44 8.14l2.92 2.96"/><path d="M21.44 11.91l-2.92 2.96"/><path d="M12 3v13"/><path d="M12 16h-10"/><path d="M12 16H9.4"/><path d="m16 16-3.8 2.4-.08 1.61"/><path d="M21.44 14.87l.44 3.9z"/></svg>
                  <p className="text-sm text-[#6B7280]">Drag & drop or <label htmlFor="evidence-files" className="text-[#5E6AD2] font-medium cursor-pointer underline-offset-2 hover:underline">browse</label> image or PDF</p>
                  <p className="text-xs text-[#6B7280]">JPG, PNG, GIF, WebP, PDF &middot; up to 5MB each &middot; multiple files allowed</p>
                </div>
              </div>

              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((f, idx) => (
                    <li key={`${f.file.name}-${idx}`} className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                      {f.file.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.previewUrl} alt={f.file.name} className="h-10 w-10 object-cover rounded-md border border-[#E5E7EB]" />
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600 text-[10px] font-semibold">PDF</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#111827] truncate">{f.file.name}</p>
                        <p className="text-xs text-[#6B7280]">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={() => {
                        URL.revokeObjectURL(f.previewUrl);
                        setFiles((prev) => prev.filter((_, i) => i !== idx));
                      }} className="text-xs text-red-600 hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center gap-3 text-xs text-[#6B7280]">
                <span className="h-px flex-1 bg-[#E5E7EB]"></span>
                <span className="text-xs text-[#6B7280] whitespace-nowrap">OR add an external link instead</span>
                <span className="h-px flex-1 bg-[#E5E7EB]"></span>
              </div>
              <Textarea
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://example.com/image.jpg, https://example.com/doc.pdf"
                className="min-h-[60px] bg-[#F9FAFB] border-[#E5E7EB]"
              />
              <p className="text-xs text-[#6B7280]">Separate multiple external URLs with commas.</p>
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
