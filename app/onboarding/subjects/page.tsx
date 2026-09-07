"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { currentFachsemester } from "@/lib/semester";
import type { Subject } from "@/lib/types";

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

export default function OnboardingStep2Page() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [suggested, setSuggested] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user && profile && !profile.study_program_id) {
      router.push("/onboarding");
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    if (!profile?.study_program_id || !profile.start_semester_type || !profile.start_semester_year) {
      return;
    }

    const semester = currentFachsemester(
      profile.start_semester_type,
      profile.start_semester_year
    );

    supabase
      .from("study_program_subjects")
      .select("subject:subjects(id, university_id, name, created_by, created_at)")
      .eq("study_program_id", profile.study_program_id)
      .eq("semester", semester)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          const rows = (data ?? []) as unknown as { subject: Subject | null }[];
          const subjects = rows.map((r) => r.subject).filter(Boolean) as Subject[];
          setSuggested(subjects);
          setSelectedIds(new Set(subjects.map((s) => s.id)));
        }
        setLoading(false);
      });
  }, [profile]);

  function toggleSubject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAddCustom() {
    if (!customName.trim() || !profile?.university_id || !profile.study_program_id) return;
    if (!profile.start_semester_type || !profile.start_semester_year) return;

    const semester = currentFachsemester(
      profile.start_semester_type,
      profile.start_semester_year
    );

    const trimmedName = customName.trim();

    // Erst pruefen, ob an dieser Uni schon ein (fast) gleichnamiger Lernraum existiert,
    // um Duplikate zu vermeiden -> dann diesen wiederverwenden statt einen neuen anzulegen.
    const { data: existing } = await supabase
      .from("subjects")
      .select("id, university_id, name, created_by, created_at")
      .eq("university_id", profile.university_id)
      .ilike("name", trimmedName)
      .maybeSingle();

    let subject: Subject | null = existing as Subject | null;

    if (!subject) {
      const { data: created, error: createError } = await supabase
        .from("subjects")
        .insert({
          university_id: profile.university_id,
          name: trimmedName,
          created_by: user!.id,
        })
        .select()
        .single();

      if (createError) {
        setError(createError.message);
        return;
      }

      subject = created as Subject;
    }

    // Fuer zukuenftige Studierende dieses Studiengangs+Semesters vorschlagbar machen.
    await supabase.from("study_program_subjects").upsert(
      {
        study_program_id: profile.study_program_id,
        subject_id: subject.id,
        semester,
      },
      { onConflict: "study_program_id,subject_id,semester" }
    );

    setSuggested((prev) =>
      prev.some((s) => s.id === subject!.id) ? prev : [...prev, subject!]
    );
    setSelectedIds((prev) => new Set(prev).add(subject!.id));
    setCustomName("");
  }

  async function handleSubmit() {
    if (!user) return;

    setSubmitting(true);
    setError(null);

    const rows = Array.from(selectedIds).map((subjectId) => ({
      user_id: user.id,
      subject_id: subjectId,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("user_subjects")
        .upsert(rows, { onConflict: "user_id,subject_id" });

      if (upsertError) {
        setSubmitting(false);
        setError(upsertError.message);
        return;
      }
    }

    setSubmitting(false);
    // Aktuell nicht in den Onboarding-Ablauf verlinkt (siehe app/onboarding/page.tsx) -
    // der Zielschritt "Profilbild" ist inzwischen Teil des einen Onboarding-Screens.
    router.push("/");
  }

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Schritt 2 von 3
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Deine Kurse</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Basierend auf deinem Studiengang und Semester haben wir diese Fächer für
        dich vorausgewählt. Du kannst welche abwählen oder eigene hinzufügen.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {suggested.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Für dein Semester gibt es noch keine vorgeschlagenen Fächer. Füge
              deine eigenen hinzu:
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {suggested.map((subject) => (
                <li key={subject.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                    />
                    {subject.name}
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Eigenes Fach hinzufügen..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
            >
              Hinzufügen
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 w-fit rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? "Speichert..." : "Weiter"}
          </button>
        </div>
      )}
    </div>
  );
}
