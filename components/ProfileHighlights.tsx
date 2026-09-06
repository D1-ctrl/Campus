"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HighlightGroup = {
  title: string;
  coverUrl: string;
  images: string[];
};

export default function ProfileHighlights({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<HighlightGroup[]>([]);
  const [viewing, setViewing] = useState<HighlightGroup | null>(null);
  const [viewIndex, setViewIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("stories")
      .select("image_url, highlight_title, created_at")
      .eq("author_id", userId)
      .not("highlight_title", "is", null)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as { image_url: string; highlight_title: string }[];
        const byTitle = new Map<string, HighlightGroup>();

        for (const row of rows) {
          const existing = byTitle.get(row.highlight_title);
          if (existing) {
            existing.images.push(row.image_url);
          } else {
            byTitle.set(row.highlight_title, {
              title: row.highlight_title,
              coverUrl: row.image_url,
              images: [row.image_url],
            });
          }
        }

        setGroups(Array.from(byTitle.values()));
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (groups.length === 0) return null;

  return (
    <div className="flex w-full gap-4 overflow-x-auto">
      {groups.map((group) => (
        <button
          key={group.title}
          onClick={() => {
            setViewing(group);
            setViewIndex(0);
          }}
          className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
        >
          <div className="h-14 w-14 rounded-full border-2 border-black/15 p-0.5 dark:border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={group.coverUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <span className="max-w-16 truncate text-xs text-zinc-600 dark:text-zinc-400">
            {group.title}
          </span>
        </button>
      ))}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewing(null)}
        >
          <span className="absolute left-4 top-4 text-sm font-medium text-white">
            {viewing.title}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewing.images[viewIndex]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
          {viewing.images.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {viewing.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewIndex(i);
                  }}
                  className={`h-1.5 w-6 rounded-full ${
                    i === viewIndex ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
