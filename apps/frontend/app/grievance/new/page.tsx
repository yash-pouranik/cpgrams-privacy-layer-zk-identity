"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldCheck, 
  KeyRound, 
  Copy, 
  ArrowRight, 
  ArrowLeft, 
  Zap, 
  Check, 
  AlertTriangle, 
  Building2, 
  FileText, 
  Paperclip, 
  CheckCircle2, 
  RefreshCw, 
  Info,
  Clock
} from "lucide-react";
import Link from "next/link";

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

interface Department {
  deptCode: string;
  name: string;
  type: string;
  parentMinistry?: string;
}

interface Category {
  code: string;
  name: string;
  parentCode: string | null;
  departmentCode: string;
}

export default function NewGrievancePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Declaration
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  // Step 2: Organization
  const [orgType, setOrgType] = useState<"central" | "state">("central");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("NOT_LISTED");

  // Step 3: Grievance Details
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<string>("");
  const [hasPriorRef, setHasPriorRef] = useState(false);
  const [priorRefNumber, setPriorRefNumber] = useState("");
  const [priorRefDate, setPriorRefDate] = useState("");
  const [description, setDescription] = useState("");

  // Step 4: Documents & Evidence
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);

  // Step 5: Review & Captcha
  const [captchaNum1, setCaptchaNum1] = useState(12);
  const [captchaNum2, setCaptchaNum2] = useState(7);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  // Duplicate detection & issue voting (StackOverflow-style)
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

  // Submit states
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdCaseInfo, setCreatedCaseInfo] = useState<{ caseId: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [votedTrackingInfo, setVotedTrackingInfo] = useState<{
    caseId: string;
    trackingPassword?: string;
    votes: number;
  } | null>(null);
  const [copiedVotePassword, setCopiedVotePassword] = useState(false);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Debounced duplicate-detection suggestions (fires ~600ms after user pauses typing)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = description.trim();
    if (!category || trimmed.length < 20) {
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

  // Register a vote on an existing issue instead of filing a duplicate
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
      setVotedTrackingInfo({
        caseId: data.trackingCaseId || data.caseId,
        trackingPassword: data.trackingPassword,
        votes: data.votes,
      });
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

  // Generate Captcha
  const refreshCaptcha = () => {
    const n1 = Math.floor(Math.random() * 20) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  // Fetch departments & categories
  useEffect(() => {
    fetch(`${apiUrl}/master/departments`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(err => console.error("Failed to load departments:", err));

    fetch(`${apiUrl}/master/categories`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
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
        description: `${tooLarge.map((f) => f.name).join(", ")} exceeds the 5MB limit.`,
        variant: "destructive",
      });
    }
    if (accepted.length !== selected.length) {
      toast({
        title: "Unsupported File Type",
        description: "Only image or PDF files are accepted.",
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
  }, [files]);

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
    setDeclarationAgreed(true);
    setOrgType("central");
    setSelectedDept("PWD");
    setCategory("Roads & Highways");
    setHasPriorRef(true);
    setPriorRefNumber("PWD/LOCAL/2026/0991");
    setPriorRefDate("2026-02-10");
    setDescription("Severe waterlogging and multiple deep potholes on the main MG Road intersection near Central Hospital. Vehicles are suffering damage and traffic is blocked during peak hours. Urgent repair and storm drain desilting required.");
    setCaptchaAnswer(String(captchaNum1 + captchaNum2));
    setCurrentStep(5);
    toast({
      title: "⚡ Sample CPGRAMS Grievance Loaded",
      description: "All 5 steps filled with valid test data. Ready for 1-click submission!",
    });
  };

  const handlePreSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationAgreed) {
      toast({ title: "Declaration Required", description: "Please accept the exclusion declaration in Step 1.", variant: "destructive" });
      setCurrentStep(1);
      return;
    }
    if (!category || description.length < 50) {
      toast({ title: "Details Incomplete", description: "Please select category and provide at least 50 characters of description.", variant: "destructive" });
      setCurrentStep(3);
      return;
    }
    if (parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
      toast({ title: "Incorrect Captcha", description: "Please solve the mathematical security captcha correctly.", variant: "destructive" });
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
      formData.append("orgType", orgType);
      if (selectedDept && selectedDept !== "NOT_LISTED") {
        formData.append("department", selectedDept);
      }
      if (hasPriorRef && priorRefNumber) {
        formData.append("priorRefNumber", priorRefNumber);
        formData.append("priorRefDate", priorRefDate);
      }

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
          title: "Grievance Lodged Successfully",
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

  const stepsList = [
    { num: 1, label: "Declaration", desc: "Exclusions Checklist" },
    { num: 2, label: "Organization", desc: "Ministry Selection" },
    { num: 3, label: "Details", desc: "Category & Description" },
    { num: 4, label: "Evidence", desc: "Document Upload" },
    { num: 5, label: "Review & Submit", desc: "Captcha Verification" },
  ];

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
      {/* Top Breadcrumb & Demo Fill */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Pairwise Identity Protected
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleQuickDemoFill}
            className="text-xs text-[#5E6AD2] border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 flex items-center gap-1.5 h-7 px-3"
          >
            <Zap className="w-3 h-3" /> ⚡ 1-Click Quick Demo Fill
          </Button>
        </div>
      </div>

      {/* 5-Step Official CPGRAMS Lodging Stepper */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl p-4.5 mb-8 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stepsList.map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => {
                if (st.num === 1 || declarationAgreed) setCurrentStep(st.num);
              }}
              className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition ${
                currentStep === st.num
                  ? "bg-indigo-50/80 border border-indigo-200 shadow-2xs"
                  : currentStep > st.num
                  ? "text-gray-900 hover:bg-gray-50"
                  : "text-gray-400 opacity-60"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  currentStep > st.num
                    ? "bg-emerald-600 text-white"
                    : currentStep === st.num
                    ? "bg-[#5E6AD2] text-white ring-2 ring-indigo-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {currentStep > st.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.num}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-gray-400 block leading-none">Step {st.num}</span>
                <span className="text-xs font-bold text-gray-900 block truncate mt-0.5">{st.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-5 border-b border-[#E5E7EB] bg-gray-50/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-[#111827]">
                {currentStep === 1 && "Step 1: Declaration & Terms of Redressal"}
                {currentStep === 2 && "Step 2: Select Government Organization"}
                {currentStep === 3 && "Step 3: Grievance Category & Problem Details"}
                {currentStep === 4 && "Step 4: Attach Evidence & Support Documents"}
                {currentStep === 5 && "Step 5: Review Summary & Security Captcha"}
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280] mt-1">
                Official Centralized Public Grievance Redress and Monitoring System (CPGRAMS) Standard
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">
              Step {currentStep} of 5
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handlePreSubmitCheck} className="space-y-6">

            {/* STEP 1: DECLARATION */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-3 text-amber-950">
                  <div className="flex items-center gap-2 font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Exclusions Notice ( गैर-स्वीकार्य विषय )
                  </div>
                  <p className="leading-relaxed text-amber-900">
                    As per DARPG guidelines, the following categories of grievances cannot be redressed on the CPGRAMS portal:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-amber-900">
                    <li><strong>Sub-judice matters:</strong> Any matter pending before any court of law or judicial/quasi-judicial tribunal.</li>
                    <li><strong>RTI matters:</strong> Information requests under the Right to Information Act, 2005 (use official RTI portal).</li>
                    <li><strong>Religious matters:</strong> Disputes concerning places of worship, religious customs, or sectarian claims.</li>
                    <li><strong>Anonymous allegations:</strong> Vague complaints without verifiable departmental facts or evidence.</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/60 transition" onClick={() => setDeclarationAgreed(!declarationAgreed)}>
                  <input
                    type="checkbox"
                    id="declaration-checkbox"
                    checked={declarationAgreed}
                    onChange={(e) => setDeclarationAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="declaration-checkbox" className="text-xs text-gray-800 leading-relaxed cursor-pointer font-medium">
                    I declare that I have read the above guidelines. This grievance is actionable and does not fall under any excluded or sub-judice matters.
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={!declarationAgreed}
                    className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs px-6 h-9"
                  >
                    <span>Continue to Organization</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: ORGANIZATION SELECTION */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Type of Government Body</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrgType("central")}
                      className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                        orgType === "central" ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-2xs" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="text-xs font-bold block">Central Government</span>
                          <span className="text-[10px] text-gray-500 font-normal">Ministries & National Departments</span>
                        </div>
                      </div>
                      {orgType === "central" && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrgType("state")}
                      className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                        orgType === "state" ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-2xs" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="text-xs font-bold block">State Government / UT</span>
                          <span className="text-[10px] text-gray-500 font-normal">State Administration & Local Bodies</span>
                        </div>
                      </div>
                      {orgType === "state" && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Ministry / Department</label>
                    <span className="text-[11px] text-gray-500">15 Ministries Seeded</span>
                  </div>
                  <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || "NOT_LISTED")}>
                    <SelectTrigger className="w-full bg-[#F9FAFB] border-[#E5E7EB] text-xs">
                      <SelectValue placeholder="Select Ministry or Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_LISTED">NOT KNOWN / NOT LISTED (AI IGMS Auto-Route)</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.deptCode} value={d.deptCode}>
                          {d.name} ({d.deptCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-gray-500">
                    If you do not know the exact ministry, select <em>NOT KNOWN / NOT LISTED</em> and the Intelligent Grievance Management System (IGMS) will automatically route it.
                  </p>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(1)} className="text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button type="button" size="sm" onClick={() => setCurrentStep(3)} className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs px-6 h-9">
                    <span>Next: Grievance Details</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: GRIEVANCE DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Grievance Category / Sub-Category</label>
                  <Select value={category} onValueChange={(val) => setCategory(val || "")}>
                    <SelectTrigger className="w-full bg-[#F9FAFB] border-[#E5E7EB] text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat, idx) => (
                        <SelectItem key={idx} value={cat.name}>
                          {cat.name} {cat.parentCode ? `(${cat.parentCode})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prior Reference Details (Optional) */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" /> Have you filed a prior representation on this issue?
                    </label>
                    <button
                      type="button"
                      onClick={() => setHasPriorRef(!hasPriorRef)}
                      className="text-xs text-indigo-600 font-semibold cursor-pointer"
                    >
                      {hasPriorRef ? "Remove" : "+ Add Prior Ref Details"}
                    </button>
                  </div>

                  {hasPriorRef && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-gray-600 block mb-1">Previous Reference Number</label>
                        <Input
                          value={priorRefNumber}
                          onChange={(e) => setPriorRefNumber(e.target.value)}
                          placeholder="e.g. REF/2026/8812"
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-600 block mb-1">Previous Filing Date</label>
                        <Input
                          type="date"
                          value={priorRefDate}
                          onChange={(e) => setPriorRefDate(e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Grievance Description (शिकायत का विवरण)
                    </label>
                    <span className={`text-[11px] font-mono ${description.length < 50 ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
                      {description.length} / 4,000 chars (Min 50)
                    </span>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your grievance in full factual detail. State location, affected persons, dates, and administrative inaction..."
                    className="min-h-[140px] bg-[#F9FAFB] border-[#E5E7EB] text-xs resize-y leading-relaxed"
                  />
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Draft automatically saved to browser storage.
                  </p>

                  {/* Duplicate Detection & Similar Issues Suggestions */}
                  {suggestionsLoading && (
                    <p className="text-xs text-[#6B7280] flex items-center gap-1.5 pt-1">
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-[#5E6AD2] border-t-transparent animate-spin" />
                      Scanning for existing similar grievances…
                    </p>
                  )}

                  {!suggestionsLoading && ownDuplicate && !suggestedVoted && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                          You have already reported a similar grievance
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed font-mono bg-white/70 p-2.5 rounded-lg border border-amber-200 line-clamp-2">
                        <strong>{ownDuplicate.caseId}</strong>: {ownDuplicate.excerpt}
                      </p>
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/case/${ownDuplicate.caseId}`)}
                          className="text-xs border-amber-400 text-amber-900 hover:bg-amber-100 h-8"
                        >
                          <span>View Your Existing Case</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                        <span className="text-[11px] text-amber-800">
                          Track status directly instead of filing a duplicate.
                        </span>
                      </div>
                    </div>
                  )}

                  {!suggestionsLoading && suggestions.length > 0 && !suggestedVoted && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3 animate-in fade-in">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-[#5E6AD2]" />
                          <span className="text-xs font-bold text-[#5E6AD2] uppercase tracking-wider">
                            Similar Community Issues Found ({suggestions.length})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">
                          Other citizens have reported this exact issue. Voting adds urgency and helps resolve it faster without duplicate paperwork.
                        </p>
                      </div>

                      <div className="space-y-2">
                        {suggestions.map((s) => (
                          <div
                            key={s.caseId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition shadow-2xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#5E6AD2]">{s.caseId}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                                  {s.votes} citizen{s.votes === 1 ? "" : "s"} confirmed
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 mt-1 line-clamp-2 leading-relaxed">
                                {s.excerpt}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleVote(s.caseId)}
                              disabled={votingCaseId === s.caseId}
                              className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs shrink-0 self-start sm:self-auto h-8 px-3"
                            >
                              {votingCaseId === s.caseId ? "Voting..." : "This is the same — Upvote & Track"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!category || description.length < 50) {
                        toast({ title: "Incomplete", description: "Please select category and provide at least 50 characters of description.", variant: "destructive" });
                        return;
                      }
                      setCurrentStep(4);
                    }}
                    className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs px-6 h-9"
                  >
                    <span>Next: Attach Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: DOCUMENTS & EVIDENCE */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Upload Supporting Documents (Optional but Recommended)
                  </label>

                  <div className="rounded-2xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-6 text-center hover:border-indigo-300 transition">
                    <input
                      type="file"
                      id="evidence-files"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      multiple
                      onChange={handleFiles}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-indigo-50 text-[#5E6AD2] rounded-2xl">
                        <Paperclip className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        Drag & drop or <label htmlFor="evidence-files" className="text-[#5E6AD2] font-semibold cursor-pointer underline-offset-2 hover:underline">browse</label> evidence PDF / Image
                      </p>
                      <p className="text-[11px] text-gray-400">PDF, PNG, JPG &middot; up to 5MB each &middot; max 5 files</p>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <ul className="space-y-2 pt-2">
                      {files.map((f, idx) => (
                        <li key={`${f.file.name}-${idx}`} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-2xs">
                          {f.file.type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.previewUrl} alt={f.file.name} className="h-10 w-10 object-cover rounded-lg border border-gray-200" />
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 text-[10px] font-bold">PDF</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#111827] truncate">{f.file.name}</p>
                            <p className="text-[11px] text-[#6B7280]">{(f.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(f.previewUrl);
                              setFiles((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex items-center gap-3 text-xs text-[#6B7280]">
                    <span className="h-px flex-1 bg-[#E5E7EB]"></span>
                    <span className="text-[11px] text-[#6B7280]">OR attach external web link</span>
                    <span className="h-px flex-1 bg-[#E5E7EB]"></span>
                  </div>
                  <Textarea
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://example.com/document.pdf, https://drive.google.com/..."
                    className="min-h-[50px] bg-[#F9FAFB] border-[#E5E7EB] text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(3)} className="text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button type="button" size="sm" onClick={() => setCurrentStep(5)} className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs px-6 h-9">
                    <span>Next: Review & Submit</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW, CAPTCHA & SUBMISSION */}
            {currentStep === 5 && (
              <div className="space-y-5 animate-in fade-in">
                {/* Summary Review Card */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Final Grievance Summary
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-gray-200/80">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-mono">Government Body:</span>
                      <span className="font-semibold text-gray-900 capitalize">{orgType} Government</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-mono">Ministry / Department:</span>
                      <span className="font-semibold text-gray-900">{selectedDept === "NOT_LISTED" ? "Auto-detect (IGMS)" : selectedDept}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-mono">Category:</span>
                      <span className="font-semibold text-gray-900">{category || "Not selected"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-mono">Attached Evidence:</span>
                      <span className="font-semibold text-gray-900">{files.length} document(s)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-mono mb-1">Description:</span>
                    <p className="text-gray-800 bg-white p-3 rounded-xl border border-gray-200/80 leading-relaxed max-h-[100px] overflow-y-auto">
                      {description}
                    </p>
                  </div>
                </div>

                {/* Privacy Guarantee Strip */}
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Zero-Knowledge Privacy:</strong> Your real Aadhaar, email, and mobile remain permanently shielded. The handling nodal officer will only receive your randomized Pairwise Case ID.
                  </span>
                </div>

                {/* Mathematical Security Captcha */}
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                  <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                    Security Verification (Captcha)
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-indigo-300 font-mono text-base font-bold text-[#5E6AD2] shadow-2xs select-none">
                      <span>{captchaNum1}</span>
                      <span>+</span>
                      <span>{captchaNum2}</span>
                      <span>=</span>
                    </div>
                    <Input
                      type="number"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      placeholder="Enter sum"
                      className="w-32 h-10 bg-white text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 p-2 rounded-lg hover:bg-white transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh Captcha
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(4)} className="text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || description.length < 50 || !category || !captchaAnswer}
                    className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs px-8 h-10 shadow-xs"
                  >
                    Submit Privacy-Protected Grievance
                  </Button>
                </div>
              </div>
            )}
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
          <div className="space-y-3 pt-2 text-xs">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
              <div>
                <span className="font-semibold text-gray-700">Category:</span>{" "}
                <span className="text-gray-900 font-medium">{category}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Department:</span>{" "}
                <span className="text-gray-900 font-medium">{selectedDept === "NOT_LISTED" ? "Auto-Routing" : selectedDept}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Attachments:</span>{" "}
                <span className="text-gray-900">{files.length} document(s)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Real Aadhaar and contact details will remain <strong>100% hidden</strong> from the handling department.</span>
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
                Your complaint has been assigned Registration Case ID: <strong className="text-indigo-600 font-mono">{createdCaseInfo.caseId}</strong>
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

      {/* Voted Issue Tracking Password & Confirmation Modal */}
      {votedTrackingInfo && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-100 animate-in fade-in">
            <DialogHeader className="text-center sm:text-left gap-2">
              <div className="inline-flex p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 w-fit">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">Vote Recorded Successfully!</DialogTitle>
              <DialogDescription className="text-xs text-gray-600">
                You have confirmed Case <strong className="text-indigo-600 font-mono">{votedTrackingInfo.caseId}</strong>. This issue now has {votedTrackingInfo.votes} community confirmation{votedTrackingInfo.votes === 1 ? "" : "s"}.
              </DialogDescription>
            </DialogHeader>

            {votedTrackingInfo.trackingPassword && (
              <div className="my-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <p className="text-xs font-semibold text-indigo-950 uppercase tracking-wider">Your Personal Tracking Password</p>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-200">
                  <span className="font-mono text-lg font-bold text-[#5E6AD2] tracking-wider">{votedTrackingInfo.trackingPassword}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (votedTrackingInfo.trackingPassword) {
                        navigator.clipboard.writeText(votedTrackingInfo.trackingPassword);
                        setCopiedVotePassword(true);
                        setTimeout(() => setCopiedVotePassword(false), 2000);
                      }
                    }}
                    className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
                  >
                    {copiedVotePassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedVotePassword ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-600 leading-tight">
                  You can use this password on the <strong>Track Status</strong> portal anytime to monitor resolution progress without logging in.
                </p>
              </div>
            )}

            <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto flex-1 text-xs"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => {
                  if (votedTrackingInfo.trackingPassword) {
                    router.push(`/status?caseId=${encodeURIComponent(votedTrackingInfo.caseId)}&password=${encodeURIComponent(votedTrackingInfo.trackingPassword)}`);
                  } else {
                    router.push("/dashboard");
                  }
                }}
                className="w-full sm:w-auto flex-1 bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs flex items-center justify-center gap-1.5"
              >
                <span>Track Live Progress</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
