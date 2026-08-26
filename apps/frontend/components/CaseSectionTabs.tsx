"use client";

import { FileSearch, MessageSquare, ScanSearch, SlidersHorizontal, LayoutDashboard } from "lucide-react";

export type CaseTab = "overview" | "intelligence" | "evidence" | "chat" | "actions";
const sections: { id: CaseTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "intelligence", label: "AI Intelligence", icon: ScanSearch },
  { id: "evidence", label: "Evidence", icon: FileSearch },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "actions", label: "Actions", icon: SlidersHorizontal },
];

export function CaseSectionTabs({ activeTab, onChange }: { activeTab: CaseTab; onChange: (tab: CaseTab) => void }) {
  return (
    <nav aria-label="Case detail sections" className="sticky top-2 z-30 mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
      <div role="tablist" className="flex min-w-max gap-1">
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => onChange(id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeTab === id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>
    </nav>
  );
}
