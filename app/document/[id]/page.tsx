"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { documentTypeLabel } from "@/lib/document-types";
import RatingStars from "@/components/RatingStars";
import Avatar from "@/components/Avatar";
import AdGateModal from "@/components/AdGateModal";
import AdBanner from "@/components/AdBanner";
import ReportButton from "@/components/ReportButton";
import type { Document, Rating } from "@/lib/types";

type DocumentWithUploader = Document & {
  uploader: { display_name: string | null; avatar_url: string | null } | null;
};

type RatingWithUser = Rating & {
  users: { display_name: string | null; avatar_url: string | null } | null;
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [doc, setDoc] = useState<DocumentWithUploader | null>(null);
  const [ratings, setRatings] = useState<RatingWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myStars, setMyStars] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showAdGate, setShowAdGate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      { data: docData, error: docError },
      { data: ratingsData, error: ratingsError },
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("*, uploader:users!documents_uploader_id_fkey(display_name, avatar_url)")
        .eq("id", documentId)
        .single(),
      supabase
        .from("ratings")
        .select("*, users(display_name, avatar_url)")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false }),
    ]);

    if (docError) {
      setError(docError.message);
      setLoading(false);
      return;
    }

    setDoc(docData as unknown as DocumentWithUploader);
    setRatings((ratingsData ?? []) as unknown as RatingWithUser[]);

    if (ratingsError) {
      setError(ratingsError.message);
    }

    setLoading(false);
  }, [documentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const own = ratings.find((r) => r.user_id === user.id);
    if (own) {
      setMyStars(own.stars);
      setMyComment(own.comment ?? "");
    }
  }, [ratings, user]);

  useEffect(() => {
    if (!user) {
      setIsFavorite(false);
      return;
    }

    supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("document_id", documentId)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, documentId]);

  async function performDownload() {
    if (!doc) return;

    setDownloading(true);

    // Fenster sofort oeffnen (noch als direkte Reaktion auf den Klick),
    // damit der Browser das Popup nicht wegen des folgenden await blockiert.
    const popup = window.open("", "_blank");

    const { error: rpcError } = await supabase.rpc("record_download", {
      doc_id: doc.id,
    });

    setDownloading(false);

    if (rpcError) {
      popup?.close();
      setDownloadMessage("Download fehlgeschlagen. Bitte versuch es erneut.");
      return;
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(doc.file_url);
    if (popup) {
      popup.location.href = data.publicUrl;
    }

    setDoc((prev) =>
      prev ? { ...prev, download_count: prev.download_count + 1 } : prev
    );
  }

  function handleDownloadClick() {
    if (!doc) return;

    if (!user) {
      setDownloadMessage("Bitte logge dich ein, um Dokumente herunterzuladen.");
      return;
    }

    setDownloadMessage(null);

    if (doc.uploader_id === user.id) {
      void performDownload();
      return;
    }

    setShowAdGate(true);
  }

  function handleAdGateComplete() {
    setShowAdGate(false);
    void performDownload();
  }

  async function toggleFavorite() {
    if (!user || !doc) return;

    setFavoriteLoading(true);

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("document_id", doc.id);
      setIsFavorite(false);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, document_id: doc.id });
      setIsFavorite(true);
    }

    setFavoriteLoading(false);
  }

  async function handleRatingSubmit() {
    if (!user || !doc || myStars === 0) return;

    setSubmitting(true);

    const { error: upsertError } = await supabase.from("ratings").upsert(
      {
        document_id: doc.id,
        user_id: user.id,
        stars: myStars,
        comment: myComment || null,
      },
      { onConflict: "document_id,user_id" }
    );

    setSubmitting(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Lädt...
      </p>
    );
  }

  if (error || !doc) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">
        {error ?? "Dokument nicht gefunden."}
      </p>
    );
  }

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
      : null;

  const previewUrl = supabase.storage.from("documents").getPublicUrl(doc.file_url).data
    .publicUrl;
  const isPdf = doc.file_url.toLowerCase().endsWith(".pdf");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        <ArrowLeft size={15} strokeWidth={1.75} /> Zurück
      </button>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="w-fit rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium dark:bg-white/10">
            {documentTypeLabel(doc.document_type)}
          </span>
          {user && (
            <div className="flex items-center gap-3">
              {doc.uploader_id !== user.id && (
                <ReportButton
                  targetType="document"
                  targetId={doc.id}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                />
              )}
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                aria-label={
                  isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
                }
                className="disabled:opacity-50"
              >
                <Heart size={20} strokeWidth={1.75} className={isFavorite ? "fill-red-500 text-red-500" : "text-zinc-400"} />
              </button>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {doc.subject_id ? (
            <Link href={`/subjects/${doc.subject_id}`} className="hover:underline">
              {doc.subject}
            </Link>
          ) : (
            doc.subject
          )}{" "}
          · {doc.university}
        </p>
        {doc.description && <p className="text-sm">{doc.description}</p>}
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            {!doc.is_anonymous && doc.uploader && (
              <Avatar
                userId={doc.uploader_id}
                url={doc.uploader.avatar_url}
                name={doc.uploader.display_name}
                size={20}
              />
            )}
            von{" "}
            {doc.is_anonymous ? (
              "Anonymer Nutzer"
            ) : (
              <Link href={`/u/${doc.uploader_id}`} className="hover:underline">
                {doc.uploader?.display_name ?? "Unbekannt"}
              </Link>
            )}
          </span>
          {averageRating !== null && (
            <span className="flex items-center gap-1">
              <RatingStars value={Math.round(averageRating)} readOnly />
              {averageRating.toFixed(1)} ({ratings.length})
            </span>
          )}
        </div>
        <button
          onClick={handleDownloadClick}
          disabled={downloading}
          className="mt-2 w-fit rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {downloading
            ? "Wird vorbereitet..."
            : `Herunterladen · ${doc.download_count}`}
        </button>
        {downloadMessage && (
          <p className="text-sm text-red-600">
            {downloadMessage}{" "}
            {!user && (
              <Link href="/login" className="underline">
                Zum Login
              </Link>
            )}
          </p>
        )}
      </div>

      <AdBanner />

      {showAdGate && (
        <AdGateModal
          onComplete={handleAdGateComplete}
          onCancel={() => setShowAdGate(false)}
        />
      )}

      {isPdf && (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
          <iframe
            src={previewUrl}
            title={doc.title}
            className="h-[70vh] w-full"
          />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Bewertungen</h2>

        {user && (
          <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <p className="text-sm font-medium">Deine Bewertung</p>
            <RatingStars value={myStars} onChange={setMyStars} />
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Kommentar (optional)"
              rows={2}
              className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <button
              onClick={handleRatingSubmit}
              disabled={submitting || myStars === 0}
              className="w-fit rounded-full border border-black/10 px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
            >
              {submitting ? "Speichert..." : "Bewertung speichern"}
            </button>
          </div>
        )}

        {ratings.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Noch keine Bewertungen.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ratings.map((rating) => (
              <li
                key={rating.id}
                className="rounded-lg border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex items-center justify-between">
                  <RatingStars value={rating.stars} readOnly />
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {rating.users && (
                      <Avatar
                        userId={rating.user_id}
                        url={rating.users.avatar_url}
                        name={rating.users.display_name}
                        size={18}
                      />
                    )}
                    {rating.users ? (
                      <Link href={`/u/${rating.user_id}`} className="hover:underline">
                        {rating.users.display_name ?? "Unbekannt"}
                      </Link>
                    ) : (
                      "Anonym"
                    )}
                  </span>
                </div>
                {rating.comment && <p className="mt-2 text-sm">{rating.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
