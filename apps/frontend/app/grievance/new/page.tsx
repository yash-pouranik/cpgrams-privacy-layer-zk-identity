"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, KeyRound, Copy, ArrowRight, Zap, Check } from "lucide-react";

const AUTOSAVE_KEY = "cpgrams_draft_desc";

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
  previewUrl: string;
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdCaseInfo, setCreatedCaseInfo] = useState<{ caseId: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

    e.target.value = "";
  };

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
    }, 30000);
    return () => clearInterval(interval);
  }, [description]);

  const handleQuickDemoFill = () => {
    setCategory("Roads & Highways");
    setDescription("Severe waterlogging and multiple deep potholes on the main MG Road intersection near Central Hospital. Vehicles are suffering damage and traffic is blocked during peak hours. Urgent repair and storm drain desilting required.");
    toast({
      title: "⚡ Sample Grievance Loaded",
      description: "Demo grievance data filled automatically for quick evaluation.",
    });
  };

  const handlePreSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || description.length < 50) {
      toast({
        title: "Validation Error",
        description: "Please select a category and provide at least 50 characters of description.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setLoading(true);
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("description", description);

      const externalUrls = evidenceUrl
        ? evidenceUrl.split(",").map((u) => u.trim()).filter((u) => u)
        : [];
      formData.append("urls", JSON.stringify(externalUrls));

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

      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));

      const data = await res.json();
      localStorage.removeItem(AUTOSAVE_KEY);
      
      const pwd = data.registrationPassword || data.password;
      setShowConfirmModal(false);
      
      if (pwd) {
        setCreatedCaseInfo({ caseId: data.caseId, password: pwd });
      } else {
        toast({
          title: "Grievance Filed Successfully",
          description: `Case ID: ${data.caseId}`,
        });
        router.push(`/case/${data.caseId}`);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (createdCaseInfo?.password) {
      navigator.clipboard.writeText(createdCaseInfo.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-12 flex-1">
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-6 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl text-[#111827]">File New Grievance</CardTitle>
            <CardDescription className="text-[#6B7280] flex items-center gap-2 mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600 font-medium">Your identity will be protected. The officer will only see your Case ID.</span>
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleQuickDemoFill}
            className="text-xs text-[#5E6AD2] border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 flex items-center gap-1.5 self-start md:self-auto"
          >
            <Zap className="w-3.5 h-3.5" /> ⚡ Quick Demo Fill
          </Button>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handlePreSubmitCheck} className="space-y-6">
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
                className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white px-8"
              >
                Submit Privacy-Protected Grievance
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog Before Submitting */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSubmit}
        loading={loading}
        title="Confirm Grievance Submission"
        icon="info"
        confirmText="Confirm & Lodge Grievance"
        description={
          <div className="space-y-3 pt-2">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div>
                <span className="font-semibold text-gray-700">Category:</span>{" "}
                <span className="text-gray-900 font-medium">{category}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Attachments:</span>{" "}
                <span className="text-gray-900">{files.length} document(s)</span>
              </div>
              <div className="text-gray-600 line-clamp-2">
                <span className="font-semibold text-gray-700">Summary:</span> {description}
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your real Aadhaar and contact details will remain <strong>100% hidden</strong> from the handling department.</span>
            </div>
          </div>
        }
      />

      {/* Registration Password & Success Modal */}
      {createdCaseInfo && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <DialogHeader className="text-center sm:text-left gap-2">
              <div className="inline-flex p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 w-fit">
                <KeyRound className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">Grievance Registered Successfully!</DialogTitle>
              <DialogDescription className="text-xs text-gray-600">
                Your grievance has been assigned Registration Case ID: <strong className="text-indigo-600 font-mono">{createdCaseInfo.caseId}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
              <p className="text-xs font-semibold text-indigo-950 uppercase tracking-wider">Save Your Registration Password</p>
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-200">
                <span className="font-mono text-lg font-bold text-[#5E6AD2] tracking-wider">{createdCaseInfo.password}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPassword}
                  className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-gray-600 leading-tight">
                Use this password on the <strong>Track Status</strong> page to check resolution progress anytime without logging into CivID SSO.
              </p>
            </div>

            <DialogFooter className="mt-2">
              <Button
                onClick={() => router.push(`/case/${createdCaseInfo.caseId}`)}
                className="w-full bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white flex items-center justify-center gap-2"
              >
                Go to Case Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
