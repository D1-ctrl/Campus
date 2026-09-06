"use client";

import { useState } from "react";
import { Flag, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type ReportButtonProps = {
  targetType: "post" | "comment" | "document";
  targetId: string;
  className?: string;
};

export default function ReportButton({ targetType, targetId, className }: ReportButtonProps) {
  const { user } = useAuth();
  const [reported, setReported] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleReport() {
    if (!user || submitting || reported) return;
    setSubmitting(true);

    await supabase.from("content_reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
    });

    setSubmitting(false);
    setReported(true);
  }

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={handleReport}
      disabled={submitting || reported}
      className={`flex items-center gap-1 hover:underline disabled:no-underline ${className ?? ""}`}
    >
      {reported ? (
        <>
          <Check size={12} strokeWidth={1.75} /> Gemeldet
        </>
      ) : (
        <>
          <Flag size={12} strokeWidth={1.75} /> Melden
        </>
      )}
    </button>
  );
}
