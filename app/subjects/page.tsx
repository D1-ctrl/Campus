"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Subject } from "@/lib/types";

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

type SubjectWithCount = Subject & { memberCount: number };

export default function SubjectsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadSubjects = useCallback(async () => {
    if (!profile?.university_id) return;
    setLoading(true);

    const [{ data: subjectsData, error: subjectsError }, { data: counts }] = await Promise.all([
      supabase.from("subjects").select("*").eq("university_id", profile.university_id).limit(300),
      supabase.rpc("subject_member_counts"),
    ]);

    if (subjectsError) {
      setError(subjectsError.message);
      setLoading(false);
      return;
    }

    const countMap = new Map<string, number>(
      (counts ?? []).map((c: { subject_id: string; member_count: number }) => [
        c.subject_id,
        c.member_count,
      ])
    );

    const merged = ((subjectsData as Subject[]) ?? [])
      .map((s) => ({ ...s, memberCount: countMap.get(s.id) ?? 0 }))
      .sort((a, b) => b.memberCount - a.memberCount);

    setSubjects(merged);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const filtered = useMemo(() => {
    if (!search) return subjects;
    const q = search.toLowerCase();
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, search]);

  async function handleCreate() {
    if (!user || !newName.trim() || !profile?.university_id) return;

    setCreating(true);
    setCreateError(null);

    const trimmedName = newName.trim();

    const { data: existing } = await supabase
      .from("subjects")
      .select("id")
      .eq("university_id", profile.university_id)
      .ilike("name", trimmedName)
      .maybeSingle();

    if (existing) {
      setCreating(false);
      setCreateError("Diesen Kurs gibt es an deiner Uni schon.");
      return;
    }

    const { data: created, error: createErr } = await supabase
      .from("subjects")
      .insert({
        university_id: profile.university_id,
        name: trimmedName,
        created_by: user.id,
      })
      .select()
      .single();

    if (createErr || !created) {
      setCreating(false);
      setCreateError(createErr?.message ?? "Fehler beim Erstellen.");
      return;
    }

    await supabase
      .from("user_subjects")
      .upsert({ user_id: user.id, subject_id: created.id }, { onConflict: "user_id,subject_id" });

    setCreating(false);
    setNewName("");
    setShowCreate(false);
    router.push(`/subjects/${created.id}`);
  }

  if (authLoading || !user) {
    return null;
  }

  if (profile && !profile.university_id) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Bitte schließe zuerst dein{" "}
        <Link href="/onboarding" className="underline">
          Onboarding
        </Link>{" "}
        ab.
      </p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kurse</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Die aktivsten Kurse an deiner Uni zuerst.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90"
        >
          {showCreate ? "Abbrechen" : "Neuer Kurs"}
        </button>
      </div>

      {showCreate && (
        <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <input
            type="text"
            placeholder="Name des Kurses"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
          />
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="w-fit rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {creating ? "Wird erstellt..." : "Erstellen"}
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Kurs suchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={inputClass}
      />

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Keine Kurse gefunden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((subject) => (
            <li key={subject.id}>
              <Link
                href={`/subjects/${subject.id}`}
                className="flex items-center justify-between rounded-md border border-black/10 px-4 py-3 text-sm transition-colors hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/5"
              >
                <span className="font-medium">{subject.name}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {subject.memberCount}{" "}
                  {subject.memberCount === 1 ? "Mitglied" : "Mitglieder"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
