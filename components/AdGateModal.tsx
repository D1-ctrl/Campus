"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeExternalUrl } from "@/lib/url-utils";
import type { Ad } from "@/lib/types";

const COUNTDOWN_SECONDS = 5;

type AdGateModalProps = {
  onComplete: () => void;
  onCancel: () => void;
};

export default function AdGateModal({ onComplete, onCancel }: AdGateModalProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .in("placement", ["gate", "banner"]);

      if (cancelled) return;

      const ads = (data as Ad[]) ?? [];
      const gateAds = ads.filter((a) => a.placement === "gate");
      const pool = gateAds.length > 0 ? gateAds : ads;

      if (pool.length === 0) {
        // Keine Werbung hinterlegt -> Download nicht blockieren.
        onComplete();
        return;
      }

      setAd(pool[Math.floor(Math.random() * pool.length)]);
      setLoading(false);
    }

    loadAd();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || secondsLeft <= 0) return;
    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
  }, [loading, secondsLeft]);

  if (loading || !ad) return null;

  const canContinue = secondsLeft <= 0;
  const href = normalizeExternalUrl(ad.link_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-[var(--background)] p-5">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Anzeige · Download wird gleich freigeschaltet
        </p>

        <a
          href={href}
          target={href ? "_blank" : undefined}
          rel="noopener noreferrer"
          className={href ? "cursor-pointer" : "pointer-events-none"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.image_url}
            alt=""
            className="max-h-72 w-full rounded-md object-cover"
          />
        </a>

        <div>
          <p className="font-medium">{ad.title}</p>
          {ad.cta_label && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{ad.cta_label}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
          >
            Abbrechen
          </button>
          <button
            onClick={onComplete}
            disabled={!canContinue}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {canContinue ? "Weiter zum Download" : `Weiter in ${secondsLeft}s`}
          </button>
        </div>
      </div>
    </div>
  );
}
