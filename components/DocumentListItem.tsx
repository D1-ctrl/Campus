"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Download, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { documentTypeLabel } from "@/lib/document-types";
import AdGateModal from "@/components/AdGateModal";
import type { Document } from "@/lib/types";

type DocumentListItemProps = {
  document: Document;
};

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function DocumentListItem({ document }: DocumentListItemProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [downloadCount, setDownloadCount] = useState(document.download_count);
  const [showAdGate, setShowAdGate] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("document_id", document.id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, document.id]);

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("document_id", document.id);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, document_id: document.id });
      setIsFavorite(true);
    }
  }

  async function performDownload() {
    const popup = window.open("", "_blank");

    const { error } = await supabase.rpc("record_download", { doc_id: document.id });

    if (error) {
      popup?.close();
      return;
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(document.file_url);
    if (popup) popup.location.href = data.publicUrl;

    setDownloadCount((c) => c + 1);
  }

  function handleDownloadClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (document.uploader_id === user.id) {
      void performDownload();
      return;
    }

    setShowAdGate(true);
  }

  function handleAdGateComplete() {
    setShowAdGate(false);
    void performDownload();
  }

  return (
    <>
      <Link
        href={`/document/${document.id}`}
        className="flex items-center gap-3 rounded-xl bg-[var(--card)] px-3 py-3 transition-colors md:rounded-lg md:bg-transparent md:px-2 md:py-2 md:hover:bg-black/[.02] md:dark:hover:bg-white/5"
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/10 md:h-11 md:w-11 md:rounded-md">
          {document.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={document.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <FileText size={20} strokeWidth={1.5} className="text-zinc-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{document.title}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {documentTypeLabel(document.document_type)}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
          {timeAgo(document.created_at)}
        </span>
        <button onClick={toggleFavorite} aria-label="Favorit" className="flex-shrink-0">
          <Heart size={17} strokeWidth={1.75} className={isFavorite ? "fill-red-500 text-red-500" : "text-zinc-400"} />
        </button>
        <button
          onClick={handleDownloadClick}
          aria-label="Herunterladen"
          className="flex flex-shrink-0 items-center gap-1"
        >
          <Download size={17} strokeWidth={1.75} className="text-zinc-400" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{downloadCount}</span>
        </button>
      </Link>
      {showAdGate && (
        <AdGateModal
          onComplete={handleAdGateComplete}
          onCancel={() => setShowAdGate(false)}
        />
      )}
    </>
  );
}
