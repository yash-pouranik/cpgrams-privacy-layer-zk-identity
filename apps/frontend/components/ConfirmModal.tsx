"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, LogOut } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "success";
  loading?: boolean;
  icon?: "info" | "warning" | "danger" | "success" | "logout";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
  icon = "info",
}: ConfirmModalProps) {
  const getIcon = () => {
    switch (icon) {
      case "danger":
        return <div className="p-2.5 rounded-full bg-red-100 text-red-600"><ShieldAlert className="w-5 h-5" /></div>;
      case "warning":
        return <div className="p-2.5 rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="w-5 h-5" /></div>;
      case "success":
        return <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>;
      case "logout":
        return <div className="p-2.5 rounded-full bg-red-50 text-red-500"><LogOut className="w-5 h-5" /></div>;
      case "info":
      default:
        return <div className="p-2.5 rounded-full bg-indigo-50 text-[#5E6AD2]"><Info className="w-5 h-5" /></div>;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "destructive":
        return "bg-red-600 hover:bg-red-700 text-white font-medium";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white font-medium";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 text-white font-medium";
      case "default":
      default:
        return "bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white font-medium";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-gray-600 leading-relaxed pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5 border-t border-gray-100 pt-4 bg-transparent -mx-6 -mb-6 px-6 pb-6 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs text-gray-700 border-gray-200 hover:bg-gray-50 h-9 px-4 rounded-lg"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-xs h-9 px-4 rounded-lg shadow-sm ${getConfirmButtonClasses()}`}
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
