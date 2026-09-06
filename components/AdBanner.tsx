"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeExternalUrl } from "@/lib/url-utils";
import type { Ad } from "@/lib/types";

export default function AdBanner() {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .eq("placement", "banner")
      .then(({ data }) => {
        if (cancelled) return;
        const ads = (data as Ad[]) ?? [];
        if (ads.length > 0) {
          setAd(ads[Math.floor(Math.random() * ads.length)]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ad) return null;

  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-black/10 p-3 dark:border-white/15">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.image_url}
        alt=""
        className="h-14 w-14 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Anzeige
        </p>
        <p className="truncate text-sm font-medium">{ad.title}</p>
      </div>
      {ad.cta_label && (
        <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs text-white">
          {ad.cta_label}
        </span>
      )}
    </div>
  );

  const href = normalizeExternalUrl(ad.link_url);
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}
