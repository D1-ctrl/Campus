"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Users, User, CalendarDays, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import DocumentListItem from "@/components/DocumentListItem";
import SegmentedToggle from "@/components/SegmentedToggle";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { POST_FEED_SELECT, enrichPosts } from "@/lib/post-feed";
import type { PostFeedItem, RawFeedPost } from "@/lib/post-feed";
import type { Document, Subject } from "@/lib/types";

const ICON_COLORS = [
  "bg-blue-600",
  "bg-fuchsia-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
] as const;

function subjectIconColor(name: string): string {
  const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ICON_COLORS[sum % ICON_COLORS.length];
}

type DocumentWithUploader = Document & {
  uploader: { display_name: string | null; avatar_url: string | null } | null;
};

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>();
  const subjectId = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<"documents" | "discussion">("documents");
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);
  const [professorName, setProfessorName] = useState("");
  const [nextExamDate, setNextExamDate] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      { data: subjectData, error: subjectError },
      { data: counts },
      { data: docsData, error: docsError },
    ] = await Promise.all([
      supabase.from("subjects").select("*").eq("id", subjectId).single(),
      supabase.rpc("subject_member_counts"),
      supabase
        .from("documents")
        .select("*, uploader:users!documents_uploader_id_fkey(display_name, avatar_url)")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (subjectError) {
      setError(subjectError.message);
      setLoading(false);
      return;
    }

    setSubject(subjectData as Subject);
    setProfessorName((subjectData as Subject).professor_name ?? "");
    setNextExamDate((subjectData as Subject).next_exam_date ?? "");

    const match = (counts ?? []).find(
      (c: { subject_id: string; member_count: number }) => c.subject_id === subjectId
    );
    setMemberCount(match?.member_count ?? 0);

    if (docsError) {
      setError(docsError.message);
    } else {
      setDocuments((docsData ?? []) as unknown as DocumentWithUploader[]);
    }

    setLoading(false);
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(POST_FEED_SELECT)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (!error) {
      const enriched = await enrichPosts((data ?? []) as unknown as RawFeedPost[], user?.id ?? null);
      setPosts(enriched);
    }
    setPostsLoaded(true);
  }, [subjectId, user?.id]);

  useEffect(() => {
    if (tab === "discussion" && !postsLoaded) {
      loadPosts();
    }
  }, [tab, postsLoaded, loadPosts]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("user_subjects")
      .select("subject_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .maybeSingle()
      .then(({ data }) => setIsMember(!!data));
  }, [user, subjectId]);

  async function toggleMembership() {
    if (!user) return;

    setJoining(true);

    if (isMember) {
      await supabase
        .from("user_subjects")
        .delete()
        .eq("user_id", user.id)
        .eq("subject_id", subjectId);
      setIsMember(false);
      setMemberCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("user_subjects")
        .upsert(
          { user_id: user.id, subject_id: subjectId },
          { onConflict: "user_id,subject_id" }
        );
      setIsMember(true);
      setMemberCount((c) => c + 1);
    }

    setJoining(false);
  }

  async function saveInfo() {
    setSavingInfo(true);

    await supabase
      .from("subjects")
      .update({
        professor_name: professorName.trim() || null,
        next_exam_date: nextExamDate || null,
      })
      .eq("id", subjectId);

    setSubject((prev) =>
      prev
        ? { ...prev, professor_name: professorName.trim() || null, next_exam_date: nextExamDate || null }
        : prev
    );
    setSavingInfo(false);
    setEditingInfo(false);
  }

  if (authLoading || !user || loading) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Lädt...
      </p>
    );
  }

  if (error || !subject) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">
        {error ?? "Kurs nicht gefunden."}
      </p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-10">
      <Link
        href="/subjects"
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 hover:underline dark:text-zinc-400 md:text-sm"
      >
        <ArrowLeft size={18} strokeWidth={1.75} className="md:hidden" />
        <span className="hidden items-center gap-1 md:flex">
          <ArrowLeft size={15} strokeWidth={1.75} /> Zurück zu Kursen
        </span>
      </Link>

      {/* Mobile course header */}
      <div className="flex flex-col items-center gap-2 text-center md:hidden">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white ${subjectIconColor(subject.name)}`}
        >
          {subject.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-xl font-semibold">{subject.name}</h1>
        {subject.professor_name && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{subject.professor_name}</p>
        )}
        <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Users size={13} strokeWidth={1.75} /> {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"}
        </p>
        <button
          onClick={toggleMembership}
          disabled={joining}
          className={
            isMember
              ? "mt-2 w-full rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
              : "mt-2 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          }
        >
          {isMember ? "Verlassen" : "Folgen"}
        </button>
      </div>

      {/* Desktop course header */}
      <div className="hidden items-center justify-between md:flex">
        <div>
          <h1 className="text-2xl font-semibold">{subject.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"}
          </p>
        </div>
        <button
          onClick={toggleMembership}
          disabled={joining}
          className={
            isMember
              ? "rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
              : "rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          }
        >
          {isMember ? "Verlassen" : "Beitreten"}
        </button>
      </div>

      {editingInfo ? (
        <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 text-sm dark:border-white/15">
          <label className="flex flex-col gap-1">
            Professor
            <input
              type="text"
              value={professorName}
              onChange={(e) => setProfessorName(e.target.value)}
              placeholder="Name des Profs"
              className="rounded-md border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1">
            Nächster Prüfungstermin
            <input
              type="date"
              value={nextExamDate}
              onChange={(e) => setNextExamDate(e.target.value)}
              className="rounded-md border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={saveInfo}
              disabled={savingInfo}
              className="w-fit rounded-full bg-accent px-4 py-1.5 text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {savingInfo ? "Speichert..." : "Speichern"}
            </button>
            <button
              onClick={() => setEditingInfo(false)}
              className="w-fit rounded-full border border-black/10 px-4 py-1.5 hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditingInfo(true)}
          className="flex w-fit items-center gap-4 self-center text-sm text-zinc-600 hover:underline dark:text-zinc-400 md:self-start"
        >
          <span className="hidden items-center gap-1 md:flex">
            <User size={14} strokeWidth={1.75} /> {subject.professor_name || "Prof. hinzufügen"}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={14} strokeWidth={1.75} />
            {subject.next_exam_date
              ? new Date(subject.next_exam_date).toLocaleDateString("de-DE")
              : "Prüfungstermin hinzufügen"}
          </span>
        </button>
      )}

      <SegmentedToggle
        value={tab}
        onChange={setTab}
        fullWidth
        options={[
          { value: "discussion", label: "Diskussion" },
          { value: "documents", label: "Dokumente" },
        ]}
      />

      {tab === "documents" ? (
        documents.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Noch keine Dokumente in diesem Kurs.
          </p>
        ) : (
          <div className="flex flex-col gap-2 md:gap-0 md:divide-y md:divide-black/5 md:dark:divide-white/10">
            {documents.map((doc) => (
              <DocumentListItem key={doc.id} document={doc} />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <PostComposer
            subjectId={subject.id}
            placeholder="Frage zu diesem Kurs stellen..."
            onCreated={loadPosts}
          />
          {posts.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Noch keine Diskussion in diesem Kurs.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
